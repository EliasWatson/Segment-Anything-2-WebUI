import io
from pathlib import Path
from threading import Lock
from dataclasses import dataclass

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
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
    previous_mask_id: int | None
    points: list[SegmentHintPoint]


@dataclass
class SavedMask:
    input_points: np.ndarray
    input_labels: np.ndarray
    mask: np.ndarray
    score: float
    logit: np.ndarray


class UploadedImage:
    def __init__(self, pixels: np.ndarray):
        self.pixels = pixels
        self.masks: list[SavedMask] = []

    def add_mask(self, mask: SavedMask) -> int:
        mask_id = len(self.masks)
        self.masks.append(mask)
        return mask_id


def get_torch_device() -> str:
    device = "cpu"
    if torch.backends.mps.is_available():
        device = "mps"
    if torch.cuda.is_available():
        device = "cuda"

    print(f"Torch device: {device}")
    return device


def main():
    device = get_torch_device()

    if device == "cuda":
        torch.autocast(device_type="cuda", dtype=torch.bfloat16).__enter__()

        if torch.cuda.get_device_properties(0).major >= 8:
            # turn on tfloat32 for Ampere GPUs (https://pytorch.org/docs/stable/notes/cuda.html#tensorfloat-32-tf32-on-ampere-devices)
            torch.backends.cuda.matmul.allow_tf32 = True
            torch.backends.cudnn.allow_tf32 = True

    sam2_model = build_sam2(model_cfg, sam2_checkpoint, device=device)
    predictor = SAM2ImagePredictor(sam2_model)
    currently_loaded_image_id: int = -1
    sam2_model_lock = Lock()

    uploaded_images: list[UploadedImage] = []
    uploaded_images_lock = Lock()

    # Make sure you have the model lock before calling this
    def load_image(image_id: int, mask_id: int | None) -> np.ndarray | None:
        with uploaded_images_lock:
            if image_id < 0 or image_id >= len(uploaded_images):
                raise HTTPException(status_code=404, detail="Image not found")

            if currently_loaded_image_id != image_id:
                predictor.set_image(uploaded_images[image_id].pixels)

            return (
                uploaded_images[image_id].masks[mask_id].logit
                if mask_id is not None
                else None
            )

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
            uploaded_images.append(UploadedImage(image_array))

        print(
            f"Image {image_id} uploaded with resolution {image_data.width}x{image_data.height}"
        )

        return image_id

    @app.post("/api/image/segment/{image_id}")
    async def api_image_segment(image_id: int, hints: SegmentHints) -> list[int]:
        input_points = np.array([[point.x, point.y] for point in hints.points])
        input_labels = np.array([1 for _ in hints.points])

        with sam2_model_lock:
            logit = load_image(image_id, hints.previous_mask_id)

            if logit is None:
                masks, scores, logits = predictor.predict(
                    point_coords=input_points,
                    point_labels=input_labels,
                    multimask_output=True,
                )
            else:
                masks, scores, logits = predictor.predict(
                    point_coords=input_points,
                    point_labels=input_labels,
                    mask_input=logit[None, :, :],
                    multimask_output=False,
                )

            sorted_ind = np.argsort(scores)[::-1]
            masks = masks[sorted_ind]
            scores = scores[sorted_ind]
            logits = logits[sorted_ind]

            with uploaded_images_lock:
                uploaded_image = uploaded_images[image_id]
                mask_ids: list[int] = [
                    uploaded_image.add_mask(
                        SavedMask(
                            input_points=input_points.copy(),
                            input_labels=input_labels.copy(),
                            mask=masks[i],
                            score=scores[i],
                            logit=logits[i],
                        )
                    )
                    for i in range(masks.shape[0])
                ]

        return mask_ids

    @app.get(
        "/api/image/get_mask/{image_id}/{mask_id}",
        responses={200: {"content": {"image/png": {}}}},
        response_class=Response,
    )
    async def api_image_get_mask(image_id: int, mask_id: int):
        with uploaded_images_lock:
            if image_id < 0 or image_id >= len(uploaded_images):
                raise HTTPException(status_code=404, detail="Image not found")

            uploaded_image = uploaded_images[image_id]

            if mask_id < 0 or mask_id >= len(uploaded_image.masks):
                raise HTTPException(status_code=404, detail="Mask not found")

            saved_mask = uploaded_image.masks[mask_id]
            mask_image = Image.fromarray((saved_mask.mask * 255).astype(np.uint8))

        buffer = io.BytesIO()
        mask_image.save(buffer, format="PNG")
        png_bytes = buffer.getvalue()

        return Response(content=png_bytes, media_type="image/png")

    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
