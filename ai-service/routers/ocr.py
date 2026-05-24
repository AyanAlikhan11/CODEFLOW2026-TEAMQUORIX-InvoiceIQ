"""
OCR Router — Text extraction from invoices
==========================================

Provides endpoints for running PaddleOCR on uploaded invoice images and PDFs,
returning extracted text with bounding-box coordinates and confidence scores.
"""

from __future__ import annotations

import io
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

logger = logging.getLogger("invoiceiq.ai.ocr")

router = APIRouter()


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class BoundingBox(BaseModel):
    """Axis-aligned bounding box in pixel coordinates."""
    x_min: int
    y_min: int
    x_max: int
    y_max: int


class OCRWord(BaseModel):
    """A single word / text region detected by OCR."""
    text: str = Field(..., description="Recognised text")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Recognition confidence")
    bounding_box: BoundingBox


class OCRPageResult(BaseModel):
    """OCR results for one page."""
    page_number: int
    full_text: str
    words: list[OCRWord]
    average_confidence: float


class OCRResponse(BaseModel):
    """Top-level response for the /ocr/extract endpoint."""
    success: bool
    document_id: str
    pages: list[OCRPageResult]
    total_pages: int


class TableCell(BaseModel):
    """A single cell inside a detected table."""
    text: str
    row: int
    col: int
    confidence: float


class ExtractedTable(BaseModel):
    """A detected table within an invoice."""
    table_index: int
    rows: int
    cols: int
    cells: list[TableCell]
    markdown: str


class TableResponse(BaseModel):
    """Top-level response for the /ocr/extract-tables endpoint."""
    success: bool
    document_id: str
    tables: list[ExtractedTable]
    total_tables: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/extract",
    response_model=OCRResponse,
    summary="Extract text from an invoice image or PDF",
)
async def extract_text(
    request: Request,
    file: UploadFile = File(..., description="Invoice image (PNG/JPEG) or PDF"),
    language: Optional[str] = Form(
        default="en",
        description="OCR language code — 'en', 'hi', or 'en+hi'",
    ),
) -> OCRResponse:
    """
    Accepts an uploaded invoice image or PDF, runs PaddleOCR, and returns
    the extracted text organised by page with bounding boxes and confidence.
    """
    # Validate file type
    content_type = file.content_type or ""
    if not any(
        ct in content_type
        for ct in ("image/png", "image/jpeg", "image/tiff", "application/pdf")
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {content_type}",
        )

    raw_bytes = await file.read()
    document_id = str(uuid.uuid4())

    try:
        ocr_svc = request.app.state.ocr_service

        # Check Redis cache first
        redis_svc = getattr(request.app.state, "redis_service", None)
        if redis_svc:
            cached = await redis_svc.get_cached_ocr(document_id)
            if cached:
                logger.info("Cache hit for document %s", document_id)
                return OCRResponse(**cached)

        # Run OCR
        if content_type == "application/pdf":
            pages = ocr_svc.extract_text_from_pdf(raw_bytes, language=language)
        else:
            image = ocr_svc.preprocess_image(io.BytesIO(raw_bytes))
            pages = [ocr_svc.extract_text(image, language=language)]

        response = OCRResponse(
            success=True,
            document_id=document_id,
            pages=pages,
            total_pages=len(pages),
        )

        # Cache result
        if redis_svc:
            await redis_svc.cache_ocr_result(document_id, response.model_dump())

        logger.info(
            "OCR completed for %s — %d page(s)", document_id, response.total_pages
        )
        return response

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("OCR extraction failed for %s", document_id)
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}")


@router.post(
    "/extract-tables",
    response_model=TableResponse,
    summary="Extract tables from an invoice image",
)
async def extract_tables(
    request: Request,
    file: UploadFile = File(..., description="Invoice image (PNG/JPEG)"),
) -> TableResponse:
    """
    Detects and extracts tabular data from invoice images using PaddleOCR's
    table recognition module.  Returns each table as a grid of cells plus
    a Markdown representation.
    """
    content_type = file.content_type or ""
    if "image" not in content_type:
        raise HTTPException(
            status_code=400,
            detail="Table extraction currently supports images only (PNG/JPEG).",
        )

    raw_bytes = await file.read()
    document_id = str(uuid.uuid4())

    try:
        ocr_svc = request.app.state.ocr_service
        image = ocr_svc.preprocess_image(io.BytesIO(raw_bytes))
        tables = ocr_svc.extract_tables(image)

        response = TableResponse(
            success=True,
            document_id=document_id,
            tables=tables,
            total_tables=len(tables),
        )

        logger.info(
            "Table extraction for %s — %d table(s)", document_id, response.total_tables
        )
        return response

    except Exception as exc:
        logger.exception("Table extraction failed for %s", document_id)
        raise HTTPException(status_code=500, detail=f"Table extraction failed: {exc}")
