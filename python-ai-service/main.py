from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI()

# ---------- MODELS ----------
class Invoice(BaseModel):
    id: str
    amount: float
    merchant: str
    category: str
    date: str | None = None

class FraudRequest(BaseModel):
    invoices: List[Invoice]

# ---------- FRAUD DETECTION ----------
def detect_fraud(invoices):
    alerts = []

    amounts = [inv["amount"] for inv in invoices]
    avg = sum(amounts) / len(amounts)

    for inv in invoices:
        if inv["amount"] > avg * 2:
            alerts.append({
                "invoiceId": inv["id"],
                "type": "high_value",
                "description": "Invoice unusually higher than average",
                "severity": "medium"
            })

    return alerts


# ---------- HEALTH SCORE ----------
def health_score(invoices):
    total = sum(inv["amount"] for inv in invoices)
    fraud_risk = min(len(invoices) * 5, 100)

    return {
        "overall": max(0, 100 - fraud_risk),
        "spending": 70,
        "savings": 60,
        "consistency": 65,
        "diversification": 75,
        "fraudRisk": fraud_risk
    }


# ---------- INSIGHTS ----------
def generate_insights(invoices):
    total = sum(inv["amount"] for inv in invoices)

    return [
        {
            "type": "observation",
            "title": "Total Spending",
            "description": f"You spent {total}",
            "impact": "medium"
        }
    ]


# ---------- ROUTES ----------
@app.post("/fraud")
def fraud(req: FraudRequest):
    return {"alerts": detect_fraud([i.dict() for i in req.invoices])}


@app.post("/health")
def health(req: FraudRequest):
    return {"healthScore": health_score([i.dict() for i in req.invoices])}


@app.post("/insights")
def insights(req: FraudRequest):
    return {
        "insights": generate_insights([i.dict() for i in req.invoices])
    }