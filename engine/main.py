from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, invoice

app = FastAPI(
    title="Invoice Analyzer API",
    description="Upload an invoice or bill image/PDF to extract structured data and run fraud detection.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(invoice.router)