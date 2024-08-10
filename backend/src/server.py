import io
from pathlib import Path
from threading import Lock

import numpy as np
import torch
import uvicorn
from fastapi import FastAPI, File, Form
from PIL import Image
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor
from typing_extensions import Annotated

host = "127.0.0.1"
port = 8000

checkpoint_dir = Path("backend/checkpoints")
sam2_checkpoint = checkpoint_dir / "sam2_hiera_base_plus.pt"
model_cfg = "sam2_hiera_b+.yaml"


def main():
    torch.autocast(device_type="cuda", dtype=torch.bfloat16).__enter__()

    if torch.cuda.get_device_properties(0).major >= 8:
        # turn on tfloat32 for Ampere GPUs (https://pytorch.org/docs/stable/notes/cuda.html#tensorfloat-32-tf32-on-ampere-devices)
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

    sam2_model = build_sam2(model_cfg, sam2_checkpoint, device="cuda")
    predictor = SAM2ImagePredictor(sam2_model)
    sam2_model_lock = Lock()

    uploaded_images: list[np.ndarray] = []
    uploaded_images_lock = Lock()

    app = FastAPI()

    @app.get("/")
    def index():
        return {"code": 0, "data": "Hello World"}

    @app.post("/api/upload_image")
    async def api_upload_images(file: Annotated[bytes, File()]):
        image_data = Image.open(io.BytesIO(file))
        image_array = np.array(image_data.convert("RGB"))

        with uploaded_images_lock:
            image_id = len(uploaded_images)
            uploaded_images.append(image_array)

        return {"code": 0, "data": image_id}

    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
