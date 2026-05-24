"""
Classification Service
=======================

Classifies expense text into predefined categories using sentence-transformer
embeddings and cosine similarity against category prototypes.

Categories
----------
Food, Shopping, Travel, Medical, Utilities, Entertainment, Office, Education,
Subscription, Rent, Insurance, Transport, Groceries, Dining, Other.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np

logger = logging.getLogger("invoiceiq.ai.services.classification")

# ---------------------------------------------------------------------------
# Category definitions with seed examples
# ---------------------------------------------------------------------------

CATEGORIES: dict[str, list[str]] = {
    "Food": [
        "restaurant bill", "food order", "lunch dinner meal",
        "swiggy zomato food delivery", "meal receipt", "cafe bill",
    ],
    "Shopping": [
        "amazon flipkart purchase", "shopping mall bill", "clothing shoes",
        "electronics purchase", "online shopping order", "retail store bill",
    ],
    "Travel": [
        "flight ticket booking", "hotel stay accommodation",
        "travel agency bill", "cab taxi fare", "airline ticket",
        "travel booking confirmation", "oyo rooms hotel",
    ],
    "Medical": [
        "hospital bill", "pharmacy medical store", "doctor consultation",
        "lab test pathology", "medical receipt", "dental clinic",
        "health checkup", "medicine purchase",
    ],
    "Utilities": [
        "electricity bill", "water bill payment", "gas cylinder bill",
        "internet broadband bill", "mobile recharge", "utility payment",
        "municipal tax", "phone bill",
    ],
    "Entertainment": [
        "movie ticket", "concert event ticket", "netflix subscription",
        "gaming purchase", "amusement park", "spotify music",
        "bookmyshow ticket", "theme park",
    ],
    "Office": [
        "office supplies", "printer paper stationery",
        "business expense", "corporate purchase", "team lunch bill",
        "client meeting expense", "office rent",
    ],
    "Education": [
        "school fees", "college tuition", "course fee payment",
        "books purchase", "online course", "coaching classes",
        "university fee", "exam fee",
    ],
    "Subscription": [
        "monthly subscription", "annual subscription plan",
        "membership fee", "recurring payment", "saas subscription",
        "software license", "cloud service",
    ],
    "Rent": [
        "house rent payment", "monthly rent", "property rent",
        "office rent", "warehouse rent", "parking rent",
    ],
    "Insurance": [
        "insurance premium", "life insurance", "health insurance",
        "vehicle insurance", "term plan premium", "insurance policy",
        "car insurance renewal",
    ],
    "Transport": [
        "fuel petrol diesel", "uber ola ride", "metro card recharge",
        "bus ticket", "train ticket", "transport bill", "parking fee",
    ],
    "Groceries": [
        "grocery store bill", "vegetables fruits purchase",
        "supermarket bill", "big bazaar dmart", "daily needs",
        "household items", "provisions store",
    ],
    "Dining": [
        "restaurant dining bill", "bar bill", "pub bill",
        "fine dining", "dinner bill", "takeaway food bill",
        "food court bill",
    ],
    "Other": [
        "miscellaneous expense", "other payment", "general expense",
        "personal expense", "unknown merchant", "cash withdrawal",
    ],
}

# Merchant type mappings
MERCHANT_TYPES: dict[str, list[str]] = {
    "Restaurant": ["restaurant", "cafe", "diner", "eatery", "food court", "bistro", "dhaba"],
    "Retailer": ["store", "shop", "mart", "mall", "market", "bazaar", "outlet", "retail"],
    "Utility Provider": ["electricity", "water", "gas", "broadband", "telecom", "mobile"],
    "Healthcare Provider": ["hospital", "clinic", "pharmacy", "medical", "dental", "lab"],
    "Transport Company": ["airlines", "travel", "cab", "taxi", "bus", "railway", "metro"],
    "Educational Institution": ["school", "college", "university", "institute", "academy", "coaching"],
    "Insurance Company": ["insurance", "life", "policy", "premium"],
    "Government": ["tax", "municipal", "government", "govt", "passport", "registration"],
    "Technology Company": ["tech", "software", "cloud", "digital", "it services"],
    "Financial Service": ["bank", "finance", "loan", "emi", "nbfc", "fintech"],
    "Real Estate": ["property", "rent", "housing", "builder", "construction"],
    "Online Marketplace": ["amazon", "flipkart", "myntra", "swiggy", "zomato", "uber", "ola"],
}


class ClassificationService:
    """
    Embedding-based expense and merchant classifier.

    Precomputes category centroid embeddings at init time so that
    classification is a single matrix multiply + argmax — extremely fast
    even on CPU.
    """

    def __init__(self) -> None:
        """Load model and precompute category embeddings."""
        self._model = None
        self._category_embeddings: dict[str, np.ndarray] = {}
        self._merchant_embeddings: dict[str, np.ndarray] = {}

        try:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            logger.info("Classification model loaded (all-MiniLM-L6-v2)")
        except ImportError:
            logger.warning(
                "sentence-transformers not installed — classification "
                "will use fallback keyword matching."
            )
            self._model = None

        self._precompute_embeddings()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def classify_expense(
        self,
        text: str,
        top_k: int = 3,
    ) -> list[dict[str, Any]]:
        """
        Classify an expense text into categories.

        Args:
            text: Invoice OCR text or description.
            top_k: Number of top predictions to return.

        Returns:
            List of dicts sorted by descending confidence, each with
            'category', 'confidence', and 'sub_categories'.
        """
        if self._model is not None and self._category_embeddings:
            return self._classify_by_embedding(text, top_k)
        else:
            return self._classify_by_keywords(text, top_k)

    def classify_merchant(
        self,
        merchant_name: str,
        context: str | None = None,
    ) -> dict[str, Any]:
        """
        Classify a merchant into a type category.

        Args:
            merchant_name: The vendor / merchant name.
            context: Optional additional text (OCR snippet).

        Returns:
            Dict with 'merchant_type', 'confidence', and 'common_categories'.
        """
        text = f"{merchant_name} {context or ''}".strip()

        if self._model is not None and self._merchant_embeddings:
            return self._classify_merchant_by_embedding(text)
        else:
            return self._classify_merchant_by_keywords(merchant_name)

    # ------------------------------------------------------------------
    # Embedding-based classification
    # ------------------------------------------------------------------

    def _precompute_embeddings(self) -> None:
        """Precompute centroid embeddings for each category."""
        if self._model is None:
            return

        for cat, examples in CATEGORIES.items():
            vecs = self._model.encode(examples, normalize_embeddings=True)
            centroid = vecs.mean(axis=0)
            centroid = centroid / np.linalg.norm(centroid)
            self._category_embeddings[cat] = centroid

        for mtype, keywords in MERCHANT_TYPES.items():
            phrases = [f"{kw} merchant" for kw in keywords]
            vecs = self._model.encode(phrases, normalize_embeddings=True)
            centroid = vecs.mean(axis=0)
            centroid = centroid / np.linalg.norm(centroid)
            self._merchant_embeddings[mtype] = centroid

        logger.info(
            "Precomputed embeddings for %d categories, %d merchant types",
            len(self._category_embeddings),
            len(self._merchant_embeddings),
        )

    def _classify_by_embedding(
        self,
        text: str,
        top_k: int,
    ) -> list[dict[str, Any]]:
        """Classify using cosine similarity against category centroids."""
        text_vec = self._model.encode(text, normalize_embeddings=True)

        scores: list[tuple[str, float]] = []
        for cat, centroid in self._category_embeddings.items():
            sim = float(np.dot(text_vec, centroid))
            scores.append((cat, sim))

        scores.sort(key=lambda x: -x[1])

        # Apply softmax-like normalisation for confidence
        max_score = scores[0][1] if scores else 0
        results: list[dict[str, Any]] = []
        for cat, sim in scores[:top_k]:
            confidence = max(0.0, min(1.0, sim))
            # Find sub-categories (related categories with sim > 0.5)
            sub_cats = [
                c for c, s in scores if c != cat and s > 0.5
            ]
            results.append({
                "category": cat,
                "confidence": round(confidence, 4),
                "sub_categories": sub_cats[:3],
            })

        return results

    def _classify_merchant_by_embedding(self, text: str) -> dict[str, Any]:
        """Classify merchant type using embeddings."""
        text_vec = self._model.encode(text, normalize_embeddings=True)

        scores: list[tuple[str, float]] = []
        for mtype, centroid in self._merchant_embeddings.items():
            sim = float(np.dot(text_vec, centroid))
            scores.append((mtype, sim))

        scores.sort(key=lambda x: -x[1])
        best_type, best_score = scores[0]

        # Map back to expense categories
        type_to_categories: dict[str, list[str]] = {
            "Restaurant": ["Food", "Dining"],
            "Retailer": ["Shopping", "Groceries"],
            "Utility Provider": ["Utilities"],
            "Healthcare Provider": ["Medical"],
            "Transport Company": ["Travel", "Transport"],
            "Educational Institution": ["Education"],
            "Insurance Company": ["Insurance"],
            "Government": ["Utilities", "Other"],
            "Technology Company": ["Office", "Subscription"],
            "Financial Service": ["Insurance", "Other"],
            "Real Estate": ["Rent"],
            "Online Marketplace": ["Shopping", "Food", "Entertainment"],
        }

        return {
            "merchant_type": best_type,
            "confidence": round(max(0.0, min(1.0, best_score)), 4),
            "common_categories": type_to_categories.get(best_type, ["Other"]),
        }

    # ------------------------------------------------------------------
    # Keyword-based fallback
    # ------------------------------------------------------------------

    def _classify_by_keywords(
        self,
        text: str,
        top_k: int,
    ) -> list[dict[str, Any]]:
        """Fallback: score categories by keyword overlap."""
        text_lower = text.lower()
        scores: list[tuple[str, float]] = []

        for cat, keywords in CATEGORIES.items():
            matches = sum(1 for kw in keywords if kw in text_lower)
            scores.append((cat, matches))

        scores.sort(key=lambda x: -x[1])
        max_matches = scores[0][1] if scores else 0

        results: list[dict[str, Any]] = []
        for cat, matches in scores[:top_k]:
            confidence = matches / max(max_matches, 1)
            results.append({
                "category": cat,
                "confidence": round(confidence, 4),
                "sub_categories": [],
            })

        return results

    def _classify_merchant_by_keywords(self, merchant_name: str) -> dict[str, Any]:
        """Fallback: match merchant name against keyword lists."""
        name_lower = merchant_name.lower()
        best_type = "Other"
        best_count = 0

        for mtype, keywords in MERCHANT_TYPES.items():
            count = sum(1 for kw in keywords if kw in name_lower)
            if count > best_count:
                best_count = count
                best_type = mtype

        return {
            "merchant_type": best_type,
            "confidence": round(min(best_count * 0.4, 1.0), 4),
            "common_categories": ["Other"],
        }
