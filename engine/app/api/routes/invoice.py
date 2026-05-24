from fastapi import APIRouter, File, HTTPException, UploadFile

from app.config import ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES
from app.fraud import detect_fraud
from app.gemini import build_invoice, call_gemini, file_to_base64
from app.models import AnalyzeResponse, BatchAnalyzeResponse

router = APIRouter(tags=["Invoice"])


# ── Shared helpers ─────────────────────────────────────────────────────────────

def _validate_upload(file: UploadFile, content: bytes) -> None:
    """Raise HTTPException if the file type or size is unacceptable."""
    mime_type = file.content_type or "application/octet-stream"
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{mime_type}'. "
                f"Allowed: {', '.join(sorted(ALLOWED_MIME_TYPES))}"
            ),
        )
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(content) / 1e6:.1f} MB). Maximum is 20 MB.",
        )


async def _process_file(file: UploadFile, content: bytes) -> AnalyzeResponse:
    """Core pipeline: validate → Gemini → build invoice → fraud check."""
    mime_type = file.content_type or "application/octet-stream"
    try:
        extracted    = await call_gemini(file_to_base64(content), mime_type)
        invoice_obj  = build_invoice(extracted)
        fraud_result = detect_fraud(invoice_obj)
        return AnalyzeResponse(
            success=True,
            filename=file.filename or "upload",
            data=invoice_obj,
            fraud=fraud_result,
        )
    except HTTPException:
        raise
    except ValueError as exc:
        return AnalyzeResponse(success=False, filename=file.filename or "upload", error=str(exc))
    except Exception as exc:
        return AnalyzeResponse(success=False, filename=file.filename or "upload", error=f"Unexpected error: {exc}")


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    summary="Analyze a single invoice",
    description=(
        "Upload a JPEG, PNG, WEBP, GIF, or PDF invoice/bill. "
        "Returns extracted fields, expense category, and a fraud risk assessment."
    ),
)
async def analyze_invoice(
    file: UploadFile = File(..., description="Invoice image or PDF"),
):
    content = await file.read()
    _validate_upload(file, content)
    return await _process_file(file, content)


@router.post(
    "/analyze/batch",
    response_model=BatchAnalyzeResponse,
    summary="Analyze multiple invoices",
    description="Upload up to 10 invoices. Each is analyzed and fraud-checked independently.",
)
async def analyze_batch(files: list[UploadFile] = File(...)):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch request.")

    results: list[AnalyzeResponse] = []

    for f in files:
        content = await f.read()
        mime_type = f.content_type or "application/octet-stream"

        if mime_type not in ALLOWED_MIME_TYPES:
            results.append(AnalyzeResponse(
                success=False,
                filename=f.filename or "upload",
                error=f"Unsupported file type '{mime_type}'.",
            ))
            continue

        results.append(await _process_file(f, content))

    return BatchAnalyzeResponse(total=len(results), results=results)