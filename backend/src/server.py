import io
from pathlib import Path
from threading import Lock

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor
from typing_extensions import Annotated

host = "127.0.0.1"
port = 8000

backend_root = Path(__file__).parent.parent.absolute()
checkpoint_dir = backend_root / "segment-anything-2" / "checkpoints"
sam2_checkpoint = checkpoint_dir / "sam2_hiera_base_plus.pt"
model_cfg = "sam2_hiera_b+.yaml"


class SegmentHintPoint(BaseModel):
    x: int
    y: int


class SegmentHints(BaseModel):
    points: list[SegmentHintPoint]


class SegmentResult(BaseModel):
    mask: list[list[float]]
    score: float


def main():
    torch.autocast(device_type="cuda", dtype=torch.bfloat16).__enter__()

    if torch.cuda.get_device_properties(0).major >= 8:
        # turn on tfloat32 for Ampere GPUs (https://pytorch.org/docs/stable/notes/cuda.html#tensorfloat-32-tf32-on-ampere-devices)
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

    sam2_model = build_sam2(model_cfg, sam2_checkpoint, device="cuda")
    predictor = SAM2ImagePredictor(sam2_model)
    currently_loaded_image_id: int = -1
    sam2_model_lock = Lock()

    uploaded_images: list[np.ndarray] = []
    uploaded_images_lock = Lock()

    # Make sure you have the model lock before calling this
    def load_image(image_id: int):
        if currently_loaded_image_id != image_id:
            with uploaded_images_lock:
                if image_id < 0 or image_id >= len(uploaded_images):
                    raise HTTPException(status_code=404, detail="Image not found")

                predictor.set_image(uploaded_images[image_id])

    app = FastAPI()

    origins = ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/api/image/upload")
    async def api_image_upload(file: Annotated[bytes, File()]) -> int:
        image_data = Image.open(io.BytesIO(file))
        image_array = np.array(image_data.convert("RGB"))

        with uploaded_images_lock:
            image_id = len(uploaded_images)
            uploaded_images.append(image_array)

        print(f"Image {image_id} uploaded with resolution {image_data.width}x{image_data.height}")

        return image_id

    @app.post("/api/image/segment/{image_id}")
    async def api_image_segment(image_id: int, hints: SegmentHints) -> SegmentResult:
        input_points = np.array([[point.x, point.y] for point in hints.points])
        input_labels = np.array([1 for _ in hints.points])

        with sam2_model_lock:
            load_image(image_id)
            masks, scores, logits = predictor.predict(
                point_coords=input_points,
                point_labels=input_labels,
                multimask_output=True,
            )

        sorted_ind = np.argsort(scores)[::-1]
        masks = masks[sorted_ind]
        scores = scores[sorted_ind]
        logits = logits[sorted_ind]

        return {"mask": masks[0].tolist(), "score": scores[0]}

    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
