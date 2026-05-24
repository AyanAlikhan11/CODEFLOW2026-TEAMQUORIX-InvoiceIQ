"""
Entity Extraction Router
========================

Provides endpoints for extracting structured invoice entities (merchant name,
amounts, dates, tax breakdown, line items, etc.) from raw OCR text.

Uses a combination of regex patterns, heuristics and lightweight NLP rules
to support a wide variety of invoice formats.
"""

from __future__ import annotations

import logging
import re
from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger("invoiceiq.ai.extraction")

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ExtractionRequest(BaseModel):
    """Input for entity extraction — accepts raw OCR text or page results."""
    text: str = Field(..., min_length=1, description="Raw OCR text from the invoice")
    language: Optional[str] = Field(default="en", description="Language hint for parsing")


class InvoiceItem(BaseModel):
    """A single line-item from the invoice."""
    description: str
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total: Optional[float] = None
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)


class TaxBreakdown(BaseModel):
    """Tax component extracted from the invoice."""
    name: str  # e.g. "CGST", "SGST", "VAT"
    rate: Optional[float] = None  # percentage
    amount: float
    confidence: float


class ExtractionResponse(BaseModel):
    """Structured extraction result."""
    success: bool
    merchant_name: Optional[str] = None
    merchant_address: Optional[str] = None
    merchant_gst: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: Optional[float] = None
    tax: list[TaxBreakdown] = Field(default_factory=list)
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    items: list[InvoiceItem] = Field(default_factory=list)
    extraction_confidence: float = Field(default=0.0, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Regex patterns
# ---------------------------------------------------------------------------

# Merchant name — usually near the top in larger font
MERCHANT_PATTERNS = [
    re.compile(r"(?:sold (?:by|to)|billed (?:by|from))[:\s]+(.+)", re.IGNORECASE),
    re.compile(r"(?:company|vendor|seller|trader)[:\s]+(.+)", re.IGNORECASE),
]

# GST / Tax ID
GST_PATTERN = re.compile(r"\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}\b")

# Invoice numbers
INVOICE_NUMBER_PATTERNS = [
    re.compile(r"(?:invoice\s*(?:no|number|#)|inv\.?\s*(?:no|#))[:\s]*([A-Z0-9\-/]+)", re.IGNORECASE),
    re.compile(r"(?:bill\s*(?:no|number|#))[:\s]*([A-Z0-9\-/]+)", re.IGNORECASE),
]

# Dates — common invoice date patterns
DATE_PATTERNS = [
    re.compile(r"(?:invoice\s*date|date|bill\s*date|issued\s*(?:on|date))[:\s]*(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})", re.IGNORECASE),
    re.compile(r"(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{2,4})", re.IGNORECASE),
]

# Amounts — look for currency symbols and keywords
AMOUNT_PATTERNS = [
    re.compile(r"(?:total|grand\s*total|amount\s*due|net\s*amount|payable)[:\s]*[₹$€£]?\s*([\d,]+(?:\.\d{1,2}))?", re.IGNORECASE),
    re.compile(r"[₹$€£]\s*([\d,]+(?:\.\d{1,2}))"),
]

SUBTOTAL_PATTERNS = [
    re.compile(r"(?:subtotal|sub-total|sub\s*total)[:\s]*[₹$€£]?\s*([\d,]+(?:\.\d{1,2}))?", re.IGNORECASE),
]

# Currency detection
CURRENCY_PATTERN = re.compile(r"[₹$€£]")

# Tax
TAX_PATTERNS = [
    re.compile(r"(?:CGST|SGST|IGST|UTGST|VAT|GST)[:\s]*@?([\d.]+)%?[:\s]*[₹$€£]?\s*([\d,]+(?:\.\d{1,2}))?", re.IGNORECASE),
    re.compile(r"(?:tax|tax\s*amount)[:\s]*[₹$€£]?\s*([\d,]+(?:\.\d{1,2}))?", re.IGNORECASE),
]

# Payment method
PAYMENT_METHODS = [
    "UPI", "NEFT", "RTGS", "IMPS", "credit card", "debit card",
    "cash", "net banking", "cheque", "bank transfer", "razorpay",
    "paytm", "phonepe", "gpay", "google pay",
]


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _first_match(patterns: list[re.Pattern], text: str) -> Optional[str]:
    """Return the first captured group from the first matching pattern."""
    for pat in patterns:
        m = pat.search(text)
        if m:
            return (m.group(1) or m.group(0)).strip()
    return None


def _parse_amount(raw: Optional[str]) -> Optional[float]:
    """Parse a comma-separated amount string to float."""
    if raw is None:
        return None
    cleaned = raw.replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _extract_tax(text: str) -> list[TaxBreakdown]:
    """Extract tax components from invoice text."""
    taxes: list[TaxBreakdown] = []
    # GST component pattern
    for m in re.finditer(
        r"((?:CGST|SGST|IGST|UTGST|VAT|GST))[:\s]*@?\s*([\d.]+)%?[:\s]*[₹$€£]?\s*([\d,]+(?:\.\d{1,2}))?",
        text,
        re.IGNORECASE,
    ):
        name = m.group(1).upper()
        rate = float(m.group(2)) if m.group(2) else None
        amount = _parse_amount(m.group(3))
        if amount is not None:
            taxes.append(TaxBreakdown(name=name, rate=rate, amount=amount, confidence=0.85))

    # Fallback — generic tax amount
    if not taxes:
        m = re.search(r"tax[:\s]*[₹$€£]?\s*([\d,]+(?:\.\d{1,2}))?", text, re.IGNORECASE)
        if m:
            amount = _parse_amount(m.group(1))
            if amount is not None:
                taxes.append(TaxBreakdown(name="Tax", rate=None, amount=amount, confidence=0.7))

    return taxes


def _extract_items(text: str) -> list[InvoiceItem]:
    """
    Attempt to extract line items from the invoice body.

    This is a heuristic approach — looks for patterns like:
        Item Name    Qty  Rate  Amount
    """
    items: list[InvoiceItem] = []
    # Split text into lines and look for lines that contain numbers
    lines = text.split("\n")
    in_table = False

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Detect table headers
        if re.search(r"(?:item|description|particulars|product|s\.no)", stripped, re.IGNORECASE):
            in_table = True
            continue

        # Detect end of table (e.g. subtotal, total lines)
        if re.search(r"(?:subtotal|sub-total|total|tax|grand)", stripped, re.IGNORECASE):
            in_table = False
            continue

        if in_table:
            # Try to parse: description  qty  unit_price  total
            # Accepts formats like: "Widget A  2  150.00  300.00"
            numbers = re.findall(r"([\d,]+(?:\.\d{1,2}))", stripped)
            if len(numbers) >= 2:
                # Assume last two numbers are unit_price and total
                desc = re.sub(r"[\d,]+\.\d{2}", "", stripped).strip()
                desc = re.sub(r"\s{2,}", " — ", desc).strip()
                if desc:
                    total = _parse_amount(numbers[-1])
                    unit_price = _parse_amount(numbers[-2]) if len(numbers) >= 2 else None
                    qty = _parse_amount(numbers[-3]) if len(numbers) >= 3 else None
                    items.append(
                        InvoiceItem(
                            description=desc,
                            quantity=qty,
                            unit_price=unit_price,
                            total=total,
                            confidence=0.7,
                        )
                    )

    return items


def _compute_confidence(result: ExtractionResponse) -> float:
    """Heuristic overall extraction confidence based on fields found."""
    fields_present = sum([
        1 if result.merchant_name else 0,
        1 if result.invoice_number else 0,
        1 if result.invoice_date else 0,
        1 if result.total_amount else 0,
        1 if result.items else 0,
        1 if result.tax else 0,
    ])
    # Also factor in item count
    item_score = min(len(result.items) / 5, 1.0) if result.items else 0
    return round((fields_present / 6 * 0.7) + (item_score * 0.3), 2)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/entities",
    response_model=ExtractionResponse,
    summary="Extract structured entities from invoice text",
)
async def extract_entities(
    request: ExtractionRequest,
) -> ExtractionResponse:
    """
    Accepts raw OCR text and returns structured invoice entities including
    merchant details, amounts, dates, tax breakdown, and line items.
    """
    text = request.text
    logger.info("Entity extraction on %d characters of text", len(text))

    try:
        result = ExtractionResponse(success=True)

        # --- Merchant name ---
        result.merchant_name = _first_match(MERCHANT_PATTERNS, text)
        # Fallback: first non-empty, non-keyword line
        if not result.merchant_name:
            for line in text.split("\n"):
                line = line.strip()
                if (
                    line
                    and len(line) > 3
                    and not re.match(r"^\d", line)
                    and not re.match(
                        r"(?:invoice|bill|receipt|date|total|tax|amount|qty|item)",
                        line,
                        re.IGNORECASE,
                    )
                ):
                    result.merchant_name = line
                    break

        # --- GST number ---
        gst_match = GST_PATTERN.search(text)
        if gst_match:
            result.merchant_gst = gst_match.group(0)

        # --- Invoice number ---
        result.invoice_number = _first_match(INVOICE_NUMBER_PATTERNS, text)

        # --- Dates ---
        date_str = _first_match(DATE_PATTERNS, text)
        result.invoice_date = date_str

        # --- Amounts ---
        subtotal_raw = _first_match(SUBTOTAL_PATTERNS, text)
        result.subtotal = _parse_amount(subtotal_raw)

        total_raw = _first_match(AMOUNT_PATTERNS, text)
        result.total_amount = _parse_amount(total_raw)

        # --- Currency ---
        curr_match = CURRENCY_PATTERN.search(text[:500])  # Search first 500 chars
        if curr_match:
            symbol_map = {"₹": "INR", "$": "USD", "€": "EUR", "£": "GBP"}
            result.currency = symbol_map.get(curr_match.group(0), curr_match.group(0))

        # --- Tax ---
        result.tax = _extract_tax(text)

        # --- Line items ---
        result.items = _extract_items(text)

        # --- Payment method ---
        text_lower = text.lower()
        for pm in PAYMENT_METHODS:
            if pm in text_lower:
                result.payment_method = pm.title()
                break

        # --- Confidence ---
        result.extraction_confidence = _compute_confidence(result)

        logger.info(
            "Extraction complete — confidence %.0f%%, merchant=%s",
            result.extraction_confidence * 100,
            result.merchant_name or "(unknown)",
        )
        return result

    except Exception as exc:
        logger.exception("Entity extraction failed")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {exc}")
