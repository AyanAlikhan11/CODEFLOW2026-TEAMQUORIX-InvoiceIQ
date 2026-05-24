"""
Embeddings & Vector Search Router
===================================

Provides endpoints for generating embeddings from invoice text and performing
similarity-based search / duplicate detection using FAISS.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

logger = logging.getLogger("invoiceiq.ai.embeddings")

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class GenerateEmbeddingRequest(BaseModel):
    """Input text for embedding generation."""
    text: str = Field(..., min_length=1, description="Text to embed")


class GenerateEmbeddingResponse(BaseModel):
    """Response containing the generated embedding vector."""
    success: bool
    embedding_id: str
    embedding: list[float]
    dimensions: int
    model: str


class SearchSimilarRequest(BaseModel):
    """Input for similarity search."""
    query_text: str = Field(..., min_length=1, description="Query invoice text")
    top_k: int = Field(default=5, ge=1, le=100, description="Number of results")
    threshold: float = Field(
        default=0.75,
        ge=0.0,
        le=1.0,
        description="Minimum cosine similarity threshold",
    )
    filters: Optional[dict] = Field(
        default=None,
        description="Optional metadata filters (merchant, date range, etc.)",
    )


class SimilarInvoice(BaseModel):
    """A single similar invoice result."""
    invoice_id: str
    similarity: float
    merchant: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[str] = None
    is_duplicate: bool


class SearchSimilarResponse(BaseModel):
    """Response for similarity search."""
    success: bool
    query_embedding_id: str
    results: list[SimilarInvoice]
    total_found: int


class AddEmbeddingsRequest(BaseModel):
    """Batch-add embeddings to the FAISS index."""
    invoices: list[dict] = Field(
        ...,
        min_length=1,
        description="List of invoices with 'id', 'text', and optional metadata",
    )


class AddEmbeddingsResponse(BaseModel):
    """Response for adding embeddings."""
    success: bool
    added_count: int
    total_indexed: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/generate",
    response_model=GenerateEmbeddingResponse,
    summary="Generate an embedding for invoice text",
)
async def generate_embedding(
    request: Request,
    body: GenerateEmbeddingRequest,
) -> GenerateEmbeddingResponse:
    """
    Generate a dense vector embedding for the given text using the
    sentence-transformers model (all-MiniLM-L6-v2, 384 dimensions).
    """
    try:
        svc = request.app.state.embedding_service
        embedding = svc.generate_embedding(body.text)
        embedding_id = str(uuid.uuid4())

        logger.info(
            "Generated embedding %s for %d chars (dim=%d)",
            embedding_id,
            len(body.text),
            len(embedding),
        )

        return GenerateEmbeddingResponse(
            success=True,
            embedding_id=embedding_id,
            embedding=embedding,
            dimensions=len(embedding),
            model="sentence-transformers/all-MiniLM-L6-v2",
        )

    except Exception as exc:
        logger.exception("Embedding generation failed")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {exc}")


@router.post(
    "/search",
    response_model=SearchSimilarResponse,
    summary="Find similar / duplicate invoices",
)
async def search_similar(
    request: Request,
    body: SearchSimilarRequest,
) -> SearchSimilarResponse:
    """
    Encode the query text, search the FAISS index, and return the most
    similar invoices.  Results above the *threshold* are flagged as
    potential duplicates.
    """
    try:
        svc = request.app.state.embedding_service

        # Generate query embedding
        query_embedding = svc.generate_embedding(body.query_text)

        # Search FAISS index
        raw_results = svc.similarity_search(
            query_embedding=query_embedding,
            k=body.top_k,
            threshold=body.threshold,
        )

        results = [
            SimilarInvoice(
                invoice_id=r["id"],
                similarity=round(r["similarity"], 4),
                merchant=r.get("merchant"),
                amount=r.get("amount"),
                date=r.get("date"),
                is_duplicate=r["similarity"] >= 0.92,  # High threshold for duplicates
            )
            for r in raw_results
        ]

        logger.info(
            "Similarity search: %d results (threshold=%.2f)",
            len(results),
            body.threshold,
        )

        return SearchSimilarResponse(
            success=True,
            query_embedding_id=str(uuid.uuid4()),
            results=results,
            total_found=len(results),
        )

    except Exception as exc:
        logger.exception("Similarity search failed")
        raise HTTPException(status_code=500, detail=f"Search failed: {exc}")


@router.post(
    "/add",
    response_model=AddEmbeddingsResponse,
    summary="Add invoice embeddings to the index",
)
async def add_embeddings(
    request: Request,
    body: AddEmbeddingsRequest,
) -> AddEmbeddingsResponse:
    """
    Batch-add invoice embeddings to the FAISS index.  Each invoice dict
    must contain an ``id`` and ``text`` key; other keys are stored as
    metadata for retrieval.
    """
    try:
        svc = request.app.state.embedding_service

        texts = [inv["text"] for inv in body.invoices]
        ids = [inv["id"] for inv in body.invoices]
        metadatas = [
            {k: v for k, v in inv.items() if k not in ("id", "text")}
            for inv in body.invoices
        ]

        # Generate all embeddings
        embeddings = svc.generate_embeddings_batch(texts)

        # Add to index
        total = svc.add_to_index(embeddings=embeddings, ids=ids, metadatas=metadatas)

        logger.info("Added %d embeddings to index (total=%d)", len(body.invoices), total)

        return AddEmbeddingsResponse(
            success=True,
            added_count=len(body.invoices),
            total_indexed=total,
        )

    except Exception as exc:
        logger.exception("Failed to add embeddings")
        raise HTTPException(status_code=500, detail=f"Failed to add embeddings: {exc}")
