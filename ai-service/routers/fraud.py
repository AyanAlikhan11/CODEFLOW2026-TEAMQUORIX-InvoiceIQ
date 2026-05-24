"""
Fraud Detection Router
=======================

Endpoints for detecting potentially fraudulent invoices through a
multi-signal approach: duplicate detection, amount anomaly detection,
merchant verification, and timing analysis.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger("invoiceiq.ai.fraud")

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class InvoiceInput(BaseModel):
    """Minimal invoice representation for fraud analysis."""
    invoice_id: str
    merchant_name: Optional[str] = None
    merchant_gst: Optional[str] = None
    amount: float
    date: Optional[str] = None
    invoice_number: Optional[str] = None
    text: Optional[str] = None


class FraudSignal(BaseModel):
    """A single fraud detection signal."""
    signal_type: str  # e.g. "duplicate", "amount_anomaly", "timing_anomaly"
    severity: str  # "low", "medium", "high", "critical"
    description: str
    confidence: float = Field(ge=0.0, le=1.0)


class FraudDetectionResponse(BaseModel):
    """Response for single-invoice fraud detection."""
    success: bool
    invoice_id: str
    fraud_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall fraud probability (0 = clean, 1 = fraudulent)",
    )
    risk_level: str  # "low", "medium", "high", "critical"
    signals: list[FraudSignal] = Field(default_factory=list)
    recommendation: str


class BatchFraudRequest(BaseModel):
    """Batch fraud detection request."""
    invoices: list[InvoiceInput] = Field(..., min_length=1)


class BatchFraudItem(BaseModel):
    """Per-invoice result inside a batch."""
    invoice_id: str
    fraud_score: float
    risk_level: str
    signals: list[FraudSignal]


class BatchFraudResponse(BaseModel):
    """Response for batch fraud detection."""
    success: bool
    total_analysed: int
    results: list[BatchFraudItem]
    summary: dict


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/detect",
    response_model=FraudDetectionResponse,
    summary="Run fraud detection on a single invoice",
)
async def detect_fraud(
    request: Request,
    body: InvoiceInput,
) -> FraudDetectionResponse:
    """
    Analyse a single invoice for signs of fraud using multiple detection
    methods: duplicate check, amount anomaly, merchant verification, and
    timing analysis.

    Returns an overall fraud score (0–1) with individual signals and a
    human-readable recommendation.
    """
    try:
        fraud_svc = request.app.state.fraud_service if hasattr(request.app.state, "fraud_service") else None
        embedding_svc = request.app.state.embedding_service

        # --- Initialise fraud service lazily if not present ---
        if fraud_svc is None:
            from services.fraud_service import FraudService
            fraud_svc = FraudService()
            request.app.state.fraud_service = fraud_svc

        result = fraud_svc.calculate_fraud_score(
            invoice=body.model_dump(),
            embedding_service=embedding_svc,
        )

        logger.info(
            "Fraud detection for %s: score=%.2f (%s), %d signal(s)",
            body.invoice_id,
            result["fraud_score"],
            result["risk_level"],
            len(result["signals"]),
        )

        return FraudDetectionResponse(
            success=True,
            invoice_id=body.invoice_id,
            fraud_score=result["fraud_score"],
            risk_level=result["risk_level"],
            signals=[
                FraudSignal(**sig) for sig in result["signals"]
            ],
            recommendation=result["recommendation"],
        )

    except Exception as exc:
        logger.exception("Fraud detection failed for %s", body.invoice_id)
        raise HTTPException(status_code=500, detail=f"Fraud detection failed: {exc}")


@router.post(
    "/batch",
    response_model=BatchFraudResponse,
    summary="Batch fraud detection for multiple invoices",
)
async def detect_fraud_batch(
    request: Request,
    body: BatchFraudRequest,
) -> BatchFraudResponse:
    """
    Run fraud detection on a batch of invoices.  Returns per-invoice
    results plus a summary with aggregate statistics.
    """
    try:
        from services.fraud_service import FraudService

        fraud_svc = FraudService()
        embedding_svc = request.app.state.embedding_service

        results: list[BatchFraudItem] = []
        risk_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}

        for inv in body.invoices:
            result = fraud_svc.calculate_fraud_score(
                invoice=inv.model_dump(),
                embedding_service=embedding_svc,
            )
            risk_counts[result["risk_level"]] = risk_counts.get(result["risk_level"], 0) + 1
            results.append(
                BatchFraudItem(
                    invoice_id=inv.invoice_id,
                    fraud_score=result["fraud_score"],
                    risk_level=result["risk_level"],
                    signals=[FraudSignal(**sig) for sig in result["signals"]],
                )
            )

        summary = {
            "total": len(body.invoices),
            "flagged": sum(1 for r in results if r.risk_level in ("high", "critical")),
            "by_risk_level": risk_counts,
            "average_fraud_score": round(
                sum(r.fraud_score for r in results) / max(len(results), 1), 3
            ),
        }

        logger.info(
            "Batch fraud detection: %d invoices, %d flagged",
            len(body.invoices),
            summary["flagged"],
        )

        return BatchFraudResponse(
            success=True,
            total_analysed=len(body.invoices),
            results=results,
            summary=summary,
        )

    except Exception as exc:
        logger.exception("Batch fraud detection failed")
        raise HTTPException(status_code=500, detail=f"Batch fraud detection failed: {exc}")
