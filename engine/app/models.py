from typing import Optional
from pydantic import BaseModel


# ── Invoice extraction models ──────────────────────────────────────────────────

class PurchasedItem(BaseModel):
    name: str
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    total_price: Optional[float] = None


class InvoiceData(BaseModel):
    merchant_name: Optional[str] = None
    merchant_address: Optional[str] = None
    merchant_phone: Optional[str] = None
    invoice_number: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    discount: Optional[float] = None
    tip: Optional[float] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    payment_method: Optional[str] = None
    category: Optional[str] = None
    category_confidence: Optional[str] = None
    category_reason: Optional[str] = None
    purchased_items: list[PurchasedItem] = []
    raw_text: Optional[str] = None


# ── Fraud detection models ─────────────────────────────────────────────────────

class FraudFlag(BaseModel):
    rule: str
    severity: str   # "low" | "medium" | "high"
    detail: str


class FraudResult(BaseModel):
    is_suspicious: bool
    risk_score: int   # 0–100
    risk_level: str   # "clean" | "low" | "medium" | "high"
    flags: list[FraudFlag]


# ── API response models ────────────────────────────────────────────────────────

class AnalyzeResponse(BaseModel):
    success: bool
    filename: str
    data: Optional[InvoiceData] = None
    fraud: Optional[FraudResult] = None
    error: Optional[str] = None


class BatchAnalyzeResponse(BaseModel):
    total: int
    results: list[AnalyzeResponse]