"""
Classification Router
=====================

Provides endpoints for classifying expenses into categories and identifying
merchant types.  Uses sentence-transformer embeddings to map invoice text
to a predefined set of expense categories via cosine similarity.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger("invoiceiq.ai.classification")

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ClassifyExpenseRequest(BaseModel):
    """Input for expense classification."""
    text: str = Field(
        ...,
        min_length=1,
        description="Invoice OCR text or description to classify",
    )
    top_k: int = Field(
        default=3,
        ge=1,
        le=15,
        description="Number of top categories to return",
    )


class CategoryPrediction(BaseModel):
    """A single category prediction with confidence."""
    category: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    sub_categories: list[str] = Field(default_factory=list)


class ClassifyExpenseResponse(BaseModel):
    """Response for expense classification."""
    success: bool
    primary_category: CategoryPrediction
    alternatives: list[CategoryPrediction] = Field(default_factory=list)


class ClassifyMerchantRequest(BaseModel):
    """Input for merchant type classification."""
    merchant_name: str = Field(..., min_length=1, description="Merchant / vendor name")
    context: Optional[str] = Field(
        default=None,
        description="Additional context (OCR text snippet)",
    )


class MerchantType(BaseModel):
    """Merchant type prediction."""
    merchant_type: str
    confidence: float
    common_categories: list[str] = Field(default_factory=list)


class ClassifyMerchantResponse(BaseModel):
    """Response for merchant classification."""
    success: bool
    merchant_name: str
    classification: MerchantType


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/expense",
    response_model=ClassifyExpenseResponse,
    summary="Classify an expense into categories",
)
async def classify_expense(
    request: Request,
    body: ClassifyExpenseRequest,
) -> ClassifyExpenseResponse:
    """
    Classify an expense into one of 15 predefined categories using
    sentence-transformer embeddings and cosine similarity.

    Categories: Food, Shopping, Travel, Medical, Utilities, Entertainment,
    Office, Education, Subscription, Rent, Insurance, Transport, Groceries,
    Dining, Other.
    """
    try:
        svc = request.app.state.classification_service

        predictions = svc.classify_expense(text=body.text, top_k=body.top_k)

        if not predictions:
            raise HTTPException(status_code=500, detail="Classification returned no results")

        primary = predictions[0]
        alternatives = predictions[1:]

        logger.info(
            "Expense classified: '%s' → %s (%.0f%%)",
            body.text[:60],
            primary["category"],
            primary["confidence"] * 100,
        )

        return ClassifyExpenseResponse(
            success=True,
            primary_category=CategoryPrediction(
                category=primary["category"],
                confidence=primary["confidence"],
                sub_categories=primary.get("sub_categories", []),
            ),
            alternatives=[
                CategoryPrediction(
                    category=p["category"],
                    confidence=p["confidence"],
                    sub_categories=p.get("sub_categories", []),
                )
                for p in alternatives
            ],
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Expense classification failed")
        raise HTTPException(status_code=500, detail=f"Classification failed: {exc}")


@router.post(
    "/merchant",
    response_model=ClassifyMerchantResponse,
    summary="Classify merchant type",
)
async def classify_merchant(
    request: Request,
    body: ClassifyMerchantRequest,
) -> ClassifyMerchantResponse:
    """
    Classify a merchant into a type (e.g. restaurant, retailer, utility provider)
    based on the merchant name and optional context text.
    """
    try:
        svc = request.app.state.classification_service

        result = svc.classify_merchant(
            merchant_name=body.merchant_name,
            context=body.context,
        )

        logger.info(
            "Merchant classified: '%s' → %s (%.0f%%)",
            body.merchant_name,
            result["merchant_type"],
            result["confidence"] * 100,
        )

        return ClassifyMerchantResponse(
            success=True,
            merchant_name=body.merchant_name,
            classification=MerchantType(
                merchant_type=result["merchant_type"],
                confidence=result["confidence"],
                common_categories=result.get("common_categories", []),
            ),
        )

    except Exception as exc:
        logger.exception("Merchant classification failed")
        raise HTTPException(status_code=500, detail=f"Classification failed: {exc}")
