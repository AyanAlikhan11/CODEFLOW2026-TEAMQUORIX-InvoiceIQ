from datetime import date, datetime

from app.models import FraudFlag, FraudResult, InvoiceData


# ── Configuration ──────────────────────────────────────────────────────────────

# Maximum expected invoice amount per category (INR).
# Invoices exceeding these trigger a high_amount flag.
CATEGORY_THRESHOLDS: dict[str, int] = {
    "Food":                       10_000,
    "Utilities":                  50_000,
    "Travel":                    200_000,
    "Medical":                   500_000,
    "Shopping":                  100_000,
    "Entertainment":              20_000,
    "Fuel":                       10_000,
    "Education":                 100_000,
    "Subscriptions":              10_000,
    "Personal Care":              15_000,
    "Electronics":               200_000,
    "Home & Garden":             150_000,
    "Professional Services":     500_000,
    "Consulting":                500_000,
    "Legal & Compliance":        300_000,
    "Marketing & Advertising":   300_000,
    "Logistics & Courier":       200_000,
    "Insurance":                 200_000,
    "Real Estate & Rent":      1_000_000,
    "Financial Services":        300_000,
    "IT & Software":             500_000,
    "Construction & Contracting": 2_000_000,
    "Events & Catering":         300_000,
    "Agriculture":               500_000,
    "Automotive":                500_000,
    "Other":                     100_000,
}

# Merchant names that look like test/placeholder data
SUSPICIOUS_MERCHANT_NAMES = {
    "test", "sample", "n/a", "na", "none",
    "invoice", "merchant", "store", "vendor", "company",
}

# Points added to risk score per severity level
SEVERITY_SCORES = {"low": 10, "medium": 25, "high": 40}


# ── Individual rules ───────────────────────────────────────────────────────────

def _check_round_amount(data: InvoiceData) -> FraudFlag | None:
    """Flag totals that are suspiciously round (e.g. exactly ₹10,000)."""
    if data.total_amount and data.total_amount >= 5_000:
        if data.total_amount % 1000 == 0:
            return FraudFlag(
                rule="round_amount",
                severity="low",
                detail=f"Total is a suspiciously round number ({data.total_amount})",
            )
    return None


def _check_high_amount(data: InvoiceData) -> FraudFlag | None:
    """Flag invoices that exceed the normal range for their category."""
    threshold = CATEGORY_THRESHOLDS.get(data.category or "Other", 100_000)
    if data.total_amount and data.total_amount > threshold:
        # B2B catch-all — less alarming than specific categories
        severity = "medium" if data.category == "Other" else "high"
        return FraudFlag(
            rule="high_amount",
            severity=severity,
            detail=(
                f"Amount {data.total_amount} exceeds the typical threshold "
                f"({threshold}) for category '{data.category}'"
            ),
        )
    return None


def _check_tax_anomaly(data: InvoiceData) -> list[FraudFlag]:
    """Flag tax rates above 30% or negative tax values."""
    flags = []
    if data.tax is not None and data.subtotal and data.subtotal > 0:
        tax_rate = (data.tax / data.subtotal) * 100
        if tax_rate > 30:
            flags.append(FraudFlag(
                rule="high_tax_rate",
                severity="medium",
                detail=f"Tax rate is {tax_rate:.1f}% — unusually high (expected ≤30%)",
            ))
        if data.tax < 0:
            flags.append(FraudFlag(
                rule="negative_tax",
                severity="high",
                detail="Tax amount is negative",
            ))
    return flags


def _check_total_mismatch(data: InvoiceData) -> FraudFlag | None:
    """Flag invoices where subtotal + tax - discount + tip ≠ total (within ₹1 tolerance)."""
    if data.subtotal and data.total_amount:
        expected = round(
            data.subtotal
            + (data.tax or 0)
            - (data.discount or 0)
            + (data.tip or 0),
            2,
        )
        actual = round(data.total_amount, 2)
        if abs(expected - actual) > 1.0:
            return FraudFlag(
                rule="total_mismatch",
                severity="high",
                detail=(
                    f"Total ({actual}) doesn't match "
                    f"subtotal + tax − discount + tip ({expected}). "
                    f"Difference: {abs(expected - actual):.2f}"
                ),
            )
    return None


def _check_date(data: InvoiceData) -> FraudFlag | None:
    """Flag future-dated or unparseable invoice dates."""
    if not data.date:
        return None
    try:
        invoice_date = datetime.strptime(data.date, "%Y-%m-%d").date()
        if invoice_date > date.today():
            return FraudFlag(
                rule="future_date",
                severity="high",
                detail=f"Invoice date {data.date} is in the future",
            )
    except ValueError:
        return FraudFlag(
            rule="invalid_date",
            severity="medium",
            detail=f"Date '{data.date}' could not be parsed as YYYY-MM-DD",
        )
    return None


def _check_missing_fields(data: InvoiceData) -> FraudFlag | None:
    """Flag invoices missing merchant name, date, or total amount."""
    missing = [
        field for field in ("merchant_name", "date", "total_amount")
        if not getattr(data, field)
    ]
    if missing:
        return FraudFlag(
            rule="missing_fields",
            severity="medium",
            detail=f"Critical fields missing: {', '.join(missing)}",
        )
    return None


def _check_suspicious_merchant(data: InvoiceData) -> FraudFlag | None:
    """Flag placeholder or generic merchant names."""
    if data.merchant_name:
        if data.merchant_name.strip().lower() in SUSPICIOUS_MERCHANT_NAMES:
            return FraudFlag(
                rule="suspicious_merchant",
                severity="medium",
                detail=f"Merchant name '{data.merchant_name}' looks like a placeholder",
            )
    return None


def _check_item_mismatches(data: InvoiceData) -> list[FraudFlag]:
    """
    Flag line items where qty × unit_price doesn't reconcile with the line total.

    Tax-aware: derives the effective multiplier from invoice-level subtotal/tax
    first, then falls back to standard Indian GST slabs (5/12/18/28%) and
    finally a pre-tax check. A line passes if ANY multiplier reconciles it.
    """
    flags = []

    # Build list of multipliers to try (most accurate first)
    multipliers: list[float] = []
    if data.subtotal and data.tax and data.subtotal > 0:
        multipliers.append(round(1.0 + data.tax / data.subtotal, 6))
    for slab in (0.05, 0.12, 0.18, 0.28):
        multipliers.append(1.0 + slab)
    multipliers.append(1.0)  # pre-tax fallback

    for item in data.purchased_items:
        if not (item.quantity and item.unit_price and item.total_price):
            continue

        base = item.quantity * item.unit_price
        matched = any(
            abs(round(base * m, 2) - item.total_price) <= 1.0
            for m in multipliers
        )
        if not matched:
            best_expected = round(base * multipliers[0], 2)
            flags.append(FraudFlag(
                rule="item_price_mismatch",
                severity="medium",
                detail=(
                    f"'{item.name}': {item.quantity} × {item.unit_price} "
                    f"(incl. applicable tax) ≈ {best_expected}, "
                    f"but line total shows {item.total_price}"
                ),
            ))

    return flags


def _check_negative_item_prices(data: InvoiceData) -> list[FraudFlag]:
    """Flag any line item with a negative unit price."""
    return [
        FraudFlag(
            rule="negative_item_price",
            severity="high",
            detail=f"'{item.name}' has a negative unit price ({item.unit_price})",
        )
        for item in data.purchased_items
        if item.unit_price is not None and item.unit_price < 0
    ]


def _check_low_confidence(data: InvoiceData) -> FraudFlag | None:
    """Flag when Gemini had low confidence categorizing the expense."""
    if data.category_confidence == "Low":
        return FraudFlag(
            rule="low_category_confidence",
            severity="low",
            detail="Gemini had low confidence categorizing this expense — manual review recommended",
        )
    return None


# ── Orchestrator ───────────────────────────────────────────────────────────────

def detect_fraud(data: InvoiceData) -> FraudResult:
    """
    Run all fraud detection rules against an extracted invoice.
    Returns a FraudResult with a 0–100 risk score and a list of triggered flags.
    """
    raw_flags: list[FraudFlag | None] = [
        _check_round_amount(data),
        _check_high_amount(data),
        _check_total_mismatch(data),
        _check_date(data),
        _check_missing_fields(data),
        _check_suspicious_merchant(data),
        _check_low_confidence(data),
    ]
    # Rules that return multiple flags
    raw_flags += _check_tax_anomaly(data)
    raw_flags += _check_item_mismatches(data)
    raw_flags += _check_negative_item_prices(data)

    flags = [f for f in raw_flags if f is not None]

    score = min(100, sum(SEVERITY_SCORES[f.severity] for f in flags))

    if score == 0:
        risk_level = "clean"
    elif score <= 20:
        risk_level = "low"
    elif score <= 50:
        risk_level = "medium"
    else:
        risk_level = "high"

    return FraudResult(
        is_suspicious=score > 0,
        risk_score=score,
        risk_level=risk_level,
        flags=flags,
    )