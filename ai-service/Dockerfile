# =============================================================================
# InvoiceIQ AI Service — Multi-stage Docker Build
# =============================================================================
# Build:   docker build -t invoiceiq-ai-service .
# Run:     docker run -p 8000:8000 invoiceiq-ai-service
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: System dependencies
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS base

# Install system libraries required by PaddleOCR and pdf2image
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Stage 2: Python dependencies
# ---------------------------------------------------------------------------
FROM base AS dependencies

WORKDIR /app

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ---------------------------------------------------------------------------
# Stage 3: Application
# ---------------------------------------------------------------------------
FROM dependencies AS production

WORKDIR /app

# Copy application source code
COPY main.py .
COPY routers/ ./routers/
COPY services/ ./services/

# Create data directories
RUN mkdir -p /data/faiss_index /data/uploads

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    FAISS_INDEX_DIR=/data/faiss_index \
    REDIS_URL=redis://redis:6379/0 \
    LOG_LEVEL=info

# Expose the service port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/ || exit 1

# Start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
