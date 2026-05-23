from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

from custom_ai_engine import local_ai_model
from financial_rules import process_and_normalize_metrics

app = FastAPI(title="CODEFLOW Hardened Custom AI FinTech Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TEMP_DIR = "./temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)
ALLOWED_IMAGE_MIMETYPES = {
    "image/jpeg", "image/png", "image/webp",
    "image/bmp", "image/tiff", "image/jpg",
}
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif"}


@app.get("/api/v1/health")
async def health_check():
    is_ready = local_ai_model is not None
    return {
        "status": "ok" if is_ready else "degraded",
        "model_loaded": is_ready,
        "model_device": getattr(local_ai_model, "device", None) if is_ready else None,
        "dependencies": {
            "fastapi": True,
            "python_multipart": True,
            "protobuf": True,
            "pillow": True,
            "transformers": True,
            "torch": True,
            "uvicorn": True,
        },
    }


@app.post("/api/v1/analyze")
async def process_invoice(file: UploadFile = File(...)):
    if local_ai_model is None:
        raise HTTPException(
            status_code=500,
            detail="Custom AI Model is currently offline or loading weights.",
        )

    filename = file.filename or "uploaded_file"
    extension = os.path.splitext(filename)[1].lower().strip(".")
    content_type = getattr(file, "content_type", "")

    if (
        content_type not in ALLOWED_IMAGE_MIMETYPES
        and extension not in ALLOWED_IMAGE_EXTENSIONS
    ):
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported file type. This endpoint accepts only image files "
                "(jpg, jpeg, png, webp, bmp, tiff). PDF uploads are not supported."
            ),
        )

    temp_file_path = os.path.join(TEMP_DIR, filename)
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        raw_vision_json = local_ai_model.analyze_invoice_image(temp_file_path)
        final_response_payload = process_and_normalize_metrics(raw_vision_json)

        return {
            "status": "success",
            "engine": "Local Donut Transformer Engine v2 (Pillar 3 Compliant)",
            "data": final_response_payload,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference Engine Crash: {str(e)}")

    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)