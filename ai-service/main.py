"""
InvoiceIQ AI Service — FastAPI Reference Implementation
========================================================

A production-grade reference microservice demonstrating the AI pipeline for
the InvoiceIQ invoice management platform.  This service provides OCR,
entity extraction, expense classification, embedding-based search, fraud
detection, and financial insights.

NOTE: This is a reference implementation.  It requires a Python environment
with CUDA / system libraries (libgl1-mesa-glx, poppler-utils) to run.  It
is NOT intended to execute inside the Next.js sandbox.

Architecture Overview
---------------------
    Client  →  FastAPI (port 8000)  →  PaddleOCR / sentence-transformers / FAISS
                     ↕
                 Redis (cache + task queue)
                     ↕
                 PostgreSQL (persistent store)

Usage
-----
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import (
    classification,
    embeddings,
    extraction,
    fraud,
    insights,
    ocr,
)

logger = logging.getLogger("invoiceiq.ai")


# ---------------------------------------------------------------------------
# Application lifespan — heavy resources are initialised once at startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialise heavyweight ML models and connections on startup."""
    logger.info("🚀 InvoiceIQ AI Service starting up …")

    # Lazy-load services so the import-time cost is deferred until here.
    from services.classification_service import ClassificationService
    from services.embedding_service import EmbeddingService
    from services.ocr_service import OCRService
    from services.redis_service import RedisService

    # --- OCR engine (PaddleOCR) ---
    _app.state.ocr_service = OCRService()
    logger.info("  ✅ OCR service initialised (PaddleOCR)")

    # --- Embedding model (sentence-transformers) ---
    _app.state.embedding_service = EmbeddingService()
    logger.info("  ✅ Embedding service initialised (all-MiniLM-L6-v2)")

    # --- Classification model ---
    _app.state.classification_service = ClassificationService()
    logger.info("  ✅ Classification service initialised")

    # --- Redis ---
    try:
        _app.state.redis_service = await RedisService.create()
        logger.info("  ✅ Redis service connected")
    except Exception as exc:
        logger.warning("  ⚠️  Redis not available — caching disabled (%s)", exc)
        _app.state.redis_service = None

    logger.info("🟢 InvoiceIQ AI Service ready to serve requests")
    yield

    # --- Shutdown cleanup ---
    logger.info("🔴 InvoiceIQ AI Service shutting down …")
    if hasattr(_app.state, "redis_service") and _app.state.redis_service is not None:
        await _app.state.redis_service.close()
    logger.info("👋 Shutdown complete")


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="InvoiceIQ AI Service",
    description=(
        "Reference microservice powering OCR, extraction, classification, "
        "embeddings, fraud detection and financial insights for the "
        "InvoiceIQ platform."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(ocr.router, prefix="/ocr", tags=["OCR"])
app.include_router(extraction.router, prefix="/extract", tags=["Extraction"])
app.include_router(classification.router, prefix="/classify", tags=["Classification"])
app.include_router(embeddings.router, prefix="/embeddings", tags=["Embeddings"])
app.include_router(fraud.router, prefix="/fraud", tags=["Fraud Detection"])
app.include_router(insights.router, prefix="/insights", tags=["Insights"])


# ---------------------------------------------------------------------------
# Global exception handler
# ---------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler that returns a structured error envelope."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc),
        },
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def health_check() -> dict:
    """Return service health and version information."""
    return {
        "service": "InvoiceIQ AI Service",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health/detailed", tags=["Health"])
async def detailed_health(request: Request) -> dict:
    """Return detailed health with model status."""
    services: dict[str, str] = {}
    try:
        services["ocr"] = "ok" if request.app.state.ocr_service else "not initialised"
        services["embeddings"] = "ok" if request.app.state.embedding_service else "not initialised"
        services["classification"] = "ok" if request.app.state.classification_service else "not initialised"
        services["redis"] = "ok" if request.app.state.redis_service else "unavailable"
    except Exception:
        pass
    return {"status": "healthy", "services": services}
