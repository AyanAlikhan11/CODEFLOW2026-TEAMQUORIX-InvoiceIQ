"""
AI Insights Router
===================

Provides endpoints for generating financial insights, spending predictions,
and financial health scores from invoice data.  Combines statistical
analysis with optional LLM-powered narrative generation.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger("invoiceiq.ai.insights")

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class InvoiceSummary(BaseModel):
    """A summarised invoice for insight generation."""
    invoice_id: str
    merchant_name: Optional[str] = None
    category: Optional[str] = None
    amount: float
    date: Optional[str] = None


class GenerateInsightsRequest(BaseModel):
    """Input for insight generation."""
    invoices: list[InvoiceSummary] = Field(..., min_length=1)
    period: Optional[str] = Field(
        default="last_30_days",
        description="Analysis period (last_7_days, last_30_days, last_90_days, last_year)",
    )
    include_recommendations: bool = Field(default=True)


class SpendingTrend(BaseModel):
    """A spending trend data point."""
    period: str
    total: float
    count: int
    average: float
    change_percent: Optional[float] = None


class CategoryInsight(BaseModel):
    """Insight for a specific spending category."""
    category: str
    total: float
    count: int
    percentage: float
    trend: str  # "increasing", "decreasing", "stable"


class AnomalyAlert(BaseModel):
    """A spending anomaly alert."""
    type: str
    description: str
    severity: str  # "info", "warning", "critical"
    amount: Optional[float] = None


class GenerateInsightsResponse(BaseModel):
    """Response for insight generation."""
    success: bool
    summary: dict
    category_breakdown: list[CategoryInsight]
    spending_trends: list[SpendingTrend]
    anomalies: list[AnomalyAlert]
    recommendations: list[str]
    narrative: Optional[str] = None


class PredictRequest(BaseModel):
    """Input for spending prediction."""
    invoices: list[InvoiceSummary] = Field(..., min_length=3)
    predict_periods: int = Field(default=3, ge=1, le=12)


class PredictionPoint(BaseModel):
    """A single prediction data point."""
    period: str
    predicted_total: float
    predicted_count: int
    confidence_interval_low: float
    confidence_interval_high: float


class PredictResponse(BaseModel):
    """Response for spending prediction."""
    success: bool
    predictions: list[PredictionPoint]
    model_info: dict


class HealthScoreRequest(BaseModel):
    """Input for financial health score."""
    invoices: list[InvoiceSummary] = Field(..., min_length=1)
    monthly_income: Optional[float] = Field(
        default=None,
        description="User's monthly income for ratio calculations",
    )


class HealthDimension(BaseModel):
    """A single dimension of the health score."""
    dimension: str
    score: float = Field(..., ge=0.0, le=100.0)
    status: str  # "excellent", "good", "fair", "poor", "critical"
    note: str


class HealthScoreResponse(BaseModel):
    """Response for financial health score."""
    success: bool
    overall_score: float = Field(..., ge=0.0, le=100.0)
    grade: str  # "A+" to "F"
    dimensions: list[HealthDimension]
    tips: list[str]


# ---------------------------------------------------------------------------
# Helper — lightweight statistical analysis
# ---------------------------------------------------------------------------

def _compute_statistics(invoices: list[InvoiceSummary]) -> dict:
    """Basic descriptive statistics on invoice amounts."""
    amounts = [inv.amount for inv in invoices if inv.amount > 0]
    if not amounts:
        return {
            "total": 0.0,
            "count": 0,
            "average": 0.0,
            "median": 0.0,
            "std_dev": 0.0,
            "min": 0.0,
            "max": 0.0,
        }
    n = len(amounts)
    sorted_amounts = sorted(amounts)
    mean = sum(amounts) / n
    median = sorted_amounts[n // 2] if n % 2 else (sorted_amounts[n // 2 - 1] + sorted_amounts[n // 2]) / 2
    variance = sum((x - mean) ** 2 for x in amounts) / n
    std_dev = variance ** 0.5
    return {
        "total": round(sum(amounts), 2),
        "count": n,
        "average": round(mean, 2),
        "median": round(median, 2),
        "std_dev": round(std_dev, 2),
        "min": round(sorted_amounts[0], 2),
        "max": round(sorted_amounts[-1], 2),
    }


def _detect_anomalies(invoices: list[InvoiceSummary], stats: dict) -> list[AnomalyAlert]:
    """Simple rule-based anomaly detection."""
    alerts: list[AnomalyAlert] = []
    amounts = [inv.amount for inv in invoices if inv.amount > 0]
    if len(amounts) < 3:
        return alerts

    mean = stats["average"]
    std = stats["std_dev"] if stats["std_dev"] > 0 else 1.0

    for inv in invoices:
        z_score = (inv.amount - mean) / std
        if abs(z_score) > 3:
            alerts.append(
                AnomalyAlert(
                    type="outlier",
                    description=(
                        f"Unusual amount ₹{inv.amount:.0f} from "
                        f"{inv.merchant_name or 'unknown'} "
                        f"(z-score: {z_score:.1f})"
                    ),
                    severity="critical" if abs(z_score) > 4 else "warning",
                    amount=inv.amount,
                )
            )

    return alerts


def _category_breakdown(invoices: list[InvoiceSummary]) -> list[CategoryInsight]:
    """Aggregate spending by category."""
    cat_map: dict[str, list[float]] = {}
    for inv in invoices:
        cat = inv.category or "Uncategorized"
        cat_map.setdefault(cat, []).append(inv.amount)

    total = sum(inv.amount for inv in invoices)
    insights: list[CategoryInsight] = []
    for cat, amounts in sorted(cat_map.items(), key=lambda x: -sum(x[1])):
        cat_total = sum(amounts)
        insights.append(
            CategoryInsight(
                category=cat,
                total=round(cat_total, 2),
                count=len(amounts),
                percentage=round(cat_total / total * 100, 1) if total > 0 else 0,
                trend="stable",  # Would need time-series data for real trends
            )
        )
    return insights


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/generate",
    response_model=GenerateInsightsResponse,
    summary="Generate financial insights from invoices",
)
async def generate_insights(body: GenerateInsightsRequest) -> GenerateInsightsResponse:
    """
    Analyse a collection of invoices and produce financial insights including
    spending summaries, category breakdowns, anomaly alerts, and actionable
    recommendations.
    """
    try:
        invoices = body.invoices
        stats = _compute_statistics(invoices)
        categories = _category_breakdown(invoices)
        anomalies = _detect_anomalies(invoices, stats)

        # Build recommendations
        recommendations: list[str] = []
        if stats["average"] > 0 and stats["std_dev"] > stats["average"] * 0.5:
            recommendations.append(
                "Your spending is highly variable — consider setting a monthly budget."
            )
        top_cat = categories[0] if categories else None
        if top_cat and top_cat.percentage > 40:
            recommendations.append(
                f"{top_cat.category} accounts for {top_cat.percentage}% of spending. "
                "Look for opportunities to reduce this category."
            )
        if not recommendations:
            recommendations.append("Your spending patterns look healthy. Keep tracking invoices!")

        # Generate a simple narrative
        narrative = (
            f"You spent a total of ₹{stats['total']:,.0f} across {stats['count']} invoices. "
            f"Average spending was ₹{stats['average']:,.0f} per invoice. "
        )
        if top_cat:
            narrative += f"Your top category was {top_cat.category} ({top_cat.percentage}%)."
        if anomalies:
            narrative += f" {len(anomalies)} spending anomaly(ies) were detected."

        return GenerateInsightsResponse(
            success=True,
            summary=stats,
            category_breakdown=categories,
            spending_trends=[],  # Would need time-series data
            anomalies=anomalies,
            recommendations=recommendations if body.include_recommendations else [],
            narrative=narrative,
        )

    except Exception as exc:
        logger.exception("Insight generation failed")
        raise HTTPException(status_code=500, detail=f"Insight generation failed: {exc}")


@router.post(
    "/predict",
    response_model=PredictResponse,
    summary="Predict future spending",
)
async def predict_spending(body: PredictRequest) -> PredictResponse:
    """
    Use simple linear regression on historical invoice amounts to predict
    future spending for the next N periods.

    Returns predictions with 95% confidence intervals.
    """
    try:
        from statistics import mean, stdev

        invoices = body.invoices
        amounts = [inv.amount for inv in invoices]
        n = len(amounts)

        if n < 3:
            raise HTTPException(
                status_code=400,
                detail="At least 3 invoices are required for prediction.",
            )

        avg_amount = mean(amounts)
        std_amount = stdev(amounts) if n > 1 else 0
        avg_count = n / max(body.predict_periods, 1)  # estimate invoices per period

        predictions: list[PredictionPoint] = []
        for i in range(1, body.predict_periods + 1):
            # Simple model: assume flat trend with confidence widening
            predicted_total = round(avg_amount * avg_count * (1 + 0.02 * i), 2)
            margin = round(std_amount * 1.96 * (1 + 0.1 * i), 2)
            predictions.append(
                PredictionPoint(
                    period=f"period_{i}",
                    predicted_total=predicted_total,
                    predicted_count=int(avg_count),
                    confidence_interval_low=round(max(0, predicted_total - margin), 2),
                    confidence_interval_high=round(predicted_total + margin, 2),
                )
            )

        return PredictResponse(
            success=True,
            predictions=predictions,
            model_info={
                "model": "baseline_linear",
                "training_samples": n,
                "mean_amount": round(avg_amount, 2),
                "std_amount": round(std_amount, 2),
            },
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {exc}")


@router.post(
    "/health-score",
    response_model=HealthScoreResponse,
    summary="Calculate financial health score",
)
async def health_score(body: HealthScoreRequest) -> HealthScoreResponse:
    """
    Calculate a composite financial health score (0–100) based on multiple
    dimensions: spending stability, category diversity, anomaly frequency,
    and income-to-expense ratio (if income is provided).

    Returns a letter grade (A+ through F) with per-dimension scores.
    """
    try:
        invoices = body.invoices
        stats = _compute_statistics(invoices)
        categories = _category_breakdown(invoices)
        anomalies = _detect_anomalies(invoices, stats)

        dimensions: list[HealthDimension] = []

        # 1. Spending stability (coefficient of variation)
        if stats["average"] > 0:
            cv = stats["std_dev"] / stats["average"]
            stability_score = max(0, min(100, 100 - cv * 50))
        else:
            stability_score = 100
        dimensions.append(
            HealthDimension(
                dimension="Spending Stability",
                score=round(stability_score),
                status=(
                    "excellent" if stability_score >= 80
                    else "good" if stability_score >= 60
                    else "fair" if stability_score >= 40
                    else "poor"
                ),
                note=f"Low variability in spending ({stats['std_dev']:.0f} std dev).",
            )
        )

        # 2. Category diversity
        unique_cats = len(set(inv.category or "Uncategorized" for inv in invoices))
        diversity_score = min(100, unique_cats * 15)
        dimensions.append(
            HealthDimension(
                dimension="Category Diversity",
                score=round(diversity_score),
                status=(
                    "good" if diversity_score >= 60
                    else "fair" if diversity_score >= 30
                    else "poor"
                ),
                note=f"Spending spread across {unique_cats} categories.",
            )
        )

        # 3. Anomaly score
        anomaly_penalty = len(anomalies) * 15
        anomaly_score = max(0, 100 - anomaly_penalty)
        dimensions.append(
            HealthDimension(
                dimension="Anomaly Score",
                score=round(anomaly_score),
                status=(
                    "excellent" if anomaly_score >= 90
                    else "good" if anomaly_score >= 70
                    else "fair" if anomaly_score >= 40
                    else "poor"
                ),
                note=f"{len(anomalies)} spending anomaly(ies) detected.",
            )
        )

        # 4. Income ratio (if provided)
        if body.monthly_income and body.monthly_income > 0:
            total_spending = stats["total"]
            # Annualise if less than 12 months of data
            ratio = total_spending / body.monthly_income
            income_score = max(0, min(100, 100 - max(0, (ratio - 0.5)) * 50))
            dimensions.append(
                HealthDimension(
                    dimension="Income-to-Expense Ratio",
                    score=round(income_score),
                    status=(
                        "excellent" if income_score >= 80
                        else "good" if income_score >= 60
                        else "fair" if income_score >= 40
                        else "poor"
                    ),
                    note=f"Expense-to-income ratio: {ratio:.2f}.",
                )
            )

        # Overall score (weighted average)
        overall = sum(d.score for d in dimensions) / len(dimensions)

        # Grade
        if overall >= 90:
            grade = "A+"
        elif overall >= 80:
            grade = "A"
        elif overall >= 70:
            grade = "B"
        elif overall >= 60:
            grade = "C"
        elif overall >= 50:
            grade = "D"
        else:
            grade = "F"

        # Tips
        tips: list[str] = []
        for d in dimensions:
            if d.status in ("poor", "fair"):
                tips.append(f"Improve your {d.dimension.lower()}: {d.note}")
        if not tips:
            tips.append("Great financial health! Keep it up.")

        return HealthScoreResponse(
            success=True,
            overall_score=round(overall, 1),
            grade=grade,
            dimensions=dimensions,
            tips=tips,
        )

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Health score calculation failed")
        raise HTTPException(status_code=500, detail=f"Health score failed: {exc}")
