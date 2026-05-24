"""
Redis Service
==============

Async Redis client for caching OCR results, managing task queues,
rate limiting, and session management.

Uses the ``redis.asyncio`` interface for non-blocking operations inside
the FastAPI event loop.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional

logger = logging.getLogger("invoiceiq.ai.services.redis")

# Default TTL values (seconds)
OCR_CACHE_TTL = 3600 * 24  # 24 hours
SESSION_TTL = 3600 * 2  # 2 hours
RATE_LIMIT_WINDOW = 60  # 1 minute
DEFAULT_RATE_LIMIT = 30  # requests per window


class RedisService:
    """
    Async wrapper around redis.asyncio.Redis.

    Provides:
      - OCR result caching
      - Batch job queue management
      - API rate limiting
      - Session storage
    """

    def __init__(self, redis_url: str = "redis://localhost:6379/0") -> None:
        """
        Initialise the Redis connection.

        Args:
            redis_url: Redis connection URL.
        """
        self._redis_url = redis_url
        self._client: Optional[Any] = None

    # ------------------------------------------------------------------
    # Factory
    # ------------------------------------------------------------------

    @classmethod
    async def create(cls, redis_url: str = "redis://localhost:6379/0") -> RedisService:
        """
        Async factory that creates and connects to Redis.

        Args:
            redis_url: Redis connection URL.

        Returns:
            Connected RedisService instance.

        Raises:
            ConnectionError: If Redis is not reachable.
        """
        instance = cls(redis_url)
        await instance._connect()
        return instance

    async def _connect(self) -> None:
        """Establish the async Redis connection."""
        try:
            import redis.asyncio as aioredis

            self._client = aioredis.from_url(
                self._redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=5,
            )
            # Verify connection
            await self._client.ping()
            logger.info("Connected to Redis at %s", self._redis_url)
        except Exception as exc:
            logger.warning("Failed to connect to Redis: %s", exc)
            self._client = None

    async def close(self) -> None:
        """Close the Redis connection."""
        if self._client:
            await self._client.close()
            self._client = None
            logger.info("Redis connection closed")

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------

    async def is_healthy(self) -> bool:
        """Check if the Redis connection is alive."""
        if not self._client:
            return False
        try:
            return await self._client.ping()
        except Exception:
            return False

    # ------------------------------------------------------------------
    # OCR result caching
    # ------------------------------------------------------------------

    async def cache_ocr_result(
        self,
        document_id: str,
        result: dict[str, Any],
        ttl: int = OCR_CACHE_TTL,
    ) -> bool:
        """
        Cache an OCR result for later retrieval.

        Args:
            document_id: Unique document identifier.
            result: The OCR response dict to cache.
            ttl: Time-to-live in seconds.

        Returns:
            True if caching succeeded.
        """
        if not self._client:
            return False
        try:
            key = f"ocr:result:{document_id}"
            value = json.dumps(result, default=str)
            await self._client.setex(key, ttl, value)
            logger.debug("Cached OCR result for %s (TTL=%ds)", document_id, ttl)
            return True
        except Exception as exc:
            logger.warning("Failed to cache OCR result: %s", exc)
            return False

    async def get_cached_ocr(self, document_id: str) -> Optional[dict[str, Any]]:
        """
        Retrieve a cached OCR result.

        Args:
            document_id: Unique document identifier.

        Returns:
            The cached result dict, or None if not found / expired.
        """
        if not self._client:
            return None
        try:
            key = f"ocr:result:{document_id}"
            value = await self._client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as exc:
            logger.warning("Failed to retrieve cached OCR result: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Embedding cache
    # ------------------------------------------------------------------

    async def cache_embedding(
        self,
        text_hash: str,
        embedding: list[float],
        ttl: int = OCR_CACHE_TTL,
    ) -> bool:
        """Cache a text embedding by its hash."""
        if not self._client:
            return False
        try:
            key = f"embedding:{text_hash}"
            value = json.dumps(embedding)
            await self._client.setex(key, ttl, value)
            return True
        except Exception as exc:
            logger.warning("Failed to cache embedding: %s", exc)
            return False

    async def get_cached_embedding(self, text_hash: str) -> Optional[list[float]]:
        """Retrieve a cached embedding."""
        if not self._client:
            return None
        try:
            key = f"embedding:{text_hash}"
            value = await self._client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as exc:
            logger.warning("Failed to retrieve cached embedding: %s", exc)
            return None

    # ------------------------------------------------------------------
    # Batch job queue
    # ------------------------------------------------------------------

    async def enqueue_batch_job(
        self,
        job_type: str,
        payload: dict[str, Any],
    ) -> Optional[str]:
        """
        Add a batch processing job to the queue.

        Args:
            job_type: Type of job (e.g. 'ocr_batch', 'fraud_batch').
            payload: Job data.

        Returns:
            Job ID if enqueued successfully, else None.
        """
        if not self._client:
            return None
        try:
            import uuid

            job_id = str(uuid.uuid4())
            job = {
                "job_id": job_id,
                "job_type": job_type,
                "payload": payload,
                "status": "pending",
                "created_at": time.time(),
            }

            # Push to queue and store job detail
            queue_key = f"queue:{job_type}"
            job_key = f"job:{job_type}:{job_id}"
            await self._client.rpush(queue_key, job_id)
            await self._client.hset(job_key, mapping={k: str(v) for k, v in job.items()})
            await self._client.expire(job_key, 86400)  # 24h

            logger.info("Enqueued job %s (type=%s)", job_id, job_type)
            return job_id

        except Exception as exc:
            logger.warning("Failed to enqueue job: %s", exc)
            return None

    async def get_job_status(self, job_type: str, job_id: str) -> Optional[dict[str, Any]]:
        """Get the status of a batch job."""
        if not self._client:
            return None
        try:
            job_key = f"job:{job_type}:{job_id}"
            data = await self._client.hgetall(job_key)
            return dict(data) if data else None
        except Exception as exc:
            logger.warning("Failed to get job status: %s", exc)
            return None

    async def get_queue_length(self, job_type: str) -> int:
        """Return the number of pending jobs in a queue."""
        if not self._client:
            return 0
        try:
            queue_key = f"queue:{job_type}"
            return await self._client.llen(queue_key)
        except Exception:
            return 0

    # ------------------------------------------------------------------
    # Rate limiting
    # ------------------------------------------------------------------

    async def check_rate_limit(
        self,
        client_id: str,
        limit: int = DEFAULT_RATE_LIMIT,
        window: int = RATE_LIMIT_WINDOW,
    ) -> dict[str, Any]:
        """
        Check and enforce a sliding-window rate limit.

        Uses a Redis sorted set to track request timestamps.

        Args:
            client_id: Unique client identifier (IP, API key, etc.).
            limit: Maximum requests per window.
            window: Window duration in seconds.

        Returns:
            Dict with 'allowed' (bool), 'remaining' (int), 'reset_at' (float).
        """
        if not self._client:
            return {"allowed": True, "remaining": limit, "reset_at": 0}

        try:
            key = f"ratelimit:{client_id}"
            now = time.time()
            window_start = now - window

            # Remove old entries
            await self._client.zremrangebyscore(key, 0, window_start)

            # Count current entries
            current = await self._client.zcard(key)

            if current < limit:
                await self._client.zadd(key, {str(now): now})
                await self._client.expire(key, window + 1)
                remaining = limit - int(current) - 1
                return {
                    "allowed": True,
                    "remaining": remaining,
                    "reset_at": now + window,
                }
            else:
                # Find the oldest entry to determine reset time
                oldest = await self._client.zrange(key, 0, 0, withscores=True)
                reset_at = oldest[0][1] + window if oldest else now + window
                return {
                    "allowed": False,
                    "remaining": 0,
                    "reset_at": reset_at,
                }

        except Exception as exc:
            logger.warning("Rate limit check failed: %s", exc)
            return {"allowed": True, "remaining": limit, "reset_at": 0}

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------

    async def create_session(
        self,
        session_id: str,
        user_data: dict[str, Any],
        ttl: int = SESSION_TTL,
    ) -> bool:
        """
        Create a user session.

        Args:
            session_id: Unique session identifier.
            user_data: Session data to store.
            ttl: Session TTL in seconds.

        Returns:
            True if successful.
        """
        if not self._client:
            return False
        try:
            key = f"session:{session_id}"
            value = json.dumps(user_data, default=str)
            await self._client.setex(key, ttl, value)
            return True
        except Exception as exc:
            logger.warning("Failed to create session: %s", exc)
            return False

    async def get_session(self, session_id: str) -> Optional[dict[str, Any]]:
        """Retrieve session data."""
        if not self._client:
            return None
        try:
            key = f"session:{session_id}"
            value = await self._client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as exc:
            logger.warning("Failed to get session: %s", exc)
            return None

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        if not self._client:
            return False
        try:
            key = f"session:{session_id}"
            await self._client.delete(key)
            return True
        except Exception as exc:
            logger.warning("Failed to delete session: %s", exc)
            return False
