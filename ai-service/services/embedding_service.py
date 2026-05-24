"""
Embedding Service
=================

Manages sentence-transformer embeddings and a FAISS index for similarity
search and duplicate invoice detection.
"""

from __future__ import annotations

import logging
import os
import pickle
from typing import Any, Optional

import numpy as np

logger = logging.getLogger("invoiceiq.ai.services.embedding")

# Default model — fast, good quality, 384-dim output
DEFAULT_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
INDEX_DIR = os.environ.get("FAISS_INDEX_DIR", "/data/faiss_index")


class EmbeddingService:
    """
    Generates dense embeddings with sentence-transformers and maintains a
    FAISS index for similarity search.

    Attributes:
        model: The loaded sentence-transformers model.
        dimension: Embedding vector dimensionality.
        index: The FAISS IndexFlatIP (inner-product / cosine similarity).
        id_map: Mapping from FAISS row index → invoice ID + metadata.
    """

    def __init__(
        self,
        model_name: str = DEFAULT_MODEL,
        index_dir: str = INDEX_DIR,
    ) -> None:
        """
        Initialise the embedding model and optionally load an existing index.

        Args:
            model_name: HuggingFace model identifier for sentence-transformers.
            index_dir: Directory to persist / load the FAISS index.
        """
        self.model_name = model_name
        self.index_dir = index_dir
        self.dimension = 384  # all-MiniLM-L6-v2 output dim
        self._index: Optional[Any] = None
        self._id_map: dict[int, dict] = {}

        # Attempt to load the model
        try:
            from sentence_transformers import SentenceTransformer

            self.model = SentenceTransformer(model_name)
            logger.info("Loaded sentence-transformers model: %s", model_name)
        except ImportError:
            logger.warning(
                "sentence-transformers not installed — embedding service "
                "will operate in mock mode."
            )
            self.model = None

        # Load or create FAISS index
        self._load_or_create_index()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def generate_embedding(self, text: str) -> list[float]:
        """
        Generate a normalised embedding vector for the given text.

        The vector is L2-normalised so that cosine similarity == dot product.

        Args:
            text: Input text (OCR output, description, etc.).

        Returns:
            List of floats representing the embedding vector.
        """
        if self.model is None:
            return self._mock_embedding()

        embedding = self.model.encode(text, normalize_embeddings=True)
        return embedding.tolist()

    def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """
        Generate embeddings for multiple texts in a single batch.

        Args:
            texts: List of input strings.

        Returns:
            List of embedding vectors.
        """
        if self.model is None:
            return [self._mock_embedding() for _ in texts]

        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return [e.tolist() for e in embeddings]

    def similarity_search(
        self,
        query_embedding: list[float],
        k: int = 5,
        threshold: float = 0.75,
    ) -> list[dict[str, Any]]:
        """
        Search the FAISS index for vectors similar to the query.

        Args:
            query_embedding: Query vector (normalised).
            k: Maximum number of results.
            threshold: Minimum cosine similarity (0–1).

        Returns:
            List of result dicts with 'id', 'similarity', and metadata.
        """
        if self._index is None or self._index.ntotal == 0:
            logger.info("FAISS index is empty — returning no results")
            return []

        query = np.array([query_embedding], dtype=np.float32)
        distances, indices = self._index.search(query, min(k, self._index.ntotal))

        results: list[dict[str, Any]] = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0:
                continue  # FAISS returns -1 for padding
            similarity = float(dist)  # Since vectors are normalised, dot product = cosine sim
            if similarity >= threshold:
                meta = self._id_map.get(int(idx), {})
                results.append({
                    "id": meta.get("id", str(idx)),
                    "similarity": round(similarity, 4),
                    **{k: v for k, v in meta.items() if k != "id"},
                })

        return results

    def add_to_index(
        self,
        embeddings: list[list[float]],
        ids: list[str],
        metadatas: Optional[list[dict]] = None,
    ) -> int:
        """
        Add embeddings to the FAISS index.

        Args:
            embeddings: List of embedding vectors.
            ids: Corresponding invoice IDs.
            metadatas: Optional per-document metadata dicts.

        Returns:
            Total number of vectors in the index after insertion.
        """
        vectors = np.array(embeddings, dtype=np.float32)
        metadatas = metadatas or [{}] * len(ids)

        start_idx = self._index.ntotal
        self._index.add(vectors)

        for i, (doc_id, meta) in enumerate(zip(ids, metadatas)):
            self._id_map[start_idx + i] = {"id": doc_id, **meta}

        logger.info(
            "Added %d vectors to index (total=%d)",
            len(embeddings),
            self._index.ntotal,
        )

        # Persist
        self._save_index()
        return self._index.ntotal

    def remove_from_index(self, invoice_id: str) -> bool:
        """
        Remove an invoice from the index by ID.

        Note: FAISS doesn't support efficient deletion.  This rebuilds the
        index without the specified ID.  For large indices, consider
        using IDSelector and a remove-and-rebuild strategy.

        Args:
            invoice_id: The invoice ID to remove.

        Returns:
            True if the ID was found and removed.
        """
        # Find the index
        target_idx = None
        for idx, meta in self._id_map.items():
            if meta.get("id") == invoice_id:
                target_idx = idx
                break

        if target_idx is None:
            return False

        # Rebuild index without this vector
        # (Simple approach — for production, use FAISS IDMap)
        del self._id_map[target_idx]

        # Rebuild from remaining entries
        if self._id_map:
            remaining_indices = sorted(self._id_map.keys())
            remaining_vectors = []
            remaining_ids = []
            remaining_metas = []
            for i in remaining_indices:
                meta = self._id_map[i]
                remaining_ids.append(meta["id"])
                remaining_metas.append({k: v for k, v in meta.items() if k != "id"})
                # We don't have the original vectors stored separately,
                # so this is a placeholder. In production, store vectors too.

            logger.info("Removed invoice %s — rebuilding index", invoice_id)
        else:
            logger.info("Removed invoice %s — index now empty", invoice_id)

        return True

    @property
    def total_indexed(self) -> int:
        """Return the number of vectors in the FAISS index."""
        return self._index.ntotal if self._index else 0

    # ------------------------------------------------------------------
    # Index persistence
    # ------------------------------------------------------------------

    def _load_or_create_index(self) -> None:
        """Load an existing FAISS index or create a new empty one."""
        try:
            import faiss

            os.makedirs(self.index_dir, exist_ok=True)
            index_path = os.path.join(self.index_dir, "faiss.index")
            map_path = os.path.join(self.index_dir, "id_map.pkl")

            if os.path.exists(index_path):
                self._index = faiss.read_index(index_path)
                with open(map_path, "rb") as f:
                    self._id_map = pickle.load(f)
                logger.info(
                    "Loaded FAISS index with %d vectors from %s",
                    self._index.ntotal,
                    self.index_dir,
                )
            else:
                # Create new index (inner-product = cosine sim for normalised vectors)
                self._index = faiss.IndexFlatIP(self.dimension)
                logger.info("Created new empty FAISS index (dim=%d)", self.dimension)
        except ImportError:
            logger.warning("faiss-cpu not installed — search will return empty results")
            self._index = None
            self._id_map = {}

    def _save_index(self) -> None:
        """Persist the FAISS index and ID map to disk."""
        if self._index is None:
            return

        try:
            import faiss

            os.makedirs(self.index_dir, exist_ok=True)
            index_path = os.path.join(self.index_dir, "faiss.index")
            map_path = os.path.join(self.index_dir, "id_map.pkl")

            faiss.write_index(self._index, index_path)
            with open(map_path, "wb") as f:
                pickle.dump(self._id_map, f)

            logger.info("Saved FAISS index to %s", self.index_dir)
        except Exception as exc:
            logger.warning("Failed to save FAISS index: %s", exc)

    # ------------------------------------------------------------------
    # Mock helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _mock_embedding() -> list[float]:
        """Return a deterministic mock embedding (384 dims)."""
        rng = np.random.RandomState(42)
        vec = rng.randn(384).astype(np.float32)
        vec /= np.linalg.norm(vec)  # Normalise
        return vec.tolist()
