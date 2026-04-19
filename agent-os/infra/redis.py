"""Redis adapter — async-ready wrapper with graceful fallback to in-memory."""
import asyncio
import json
from typing import Any, Optional

from core.logger import get_logger

_log = get_logger("platform.redis")

try:
    import redis.asyncio as aioredis  # type: ignore
    _REDIS_AVAILABLE = True
except ImportError:
    _REDIS_AVAILABLE = False


class RedisClient:
    """Thin async wrapper around redis with in-memory fallback."""

    def __init__(self, url: str = "redis://localhost:6379/0") -> None:
        self._url = url
        self._client: Any = None
        self._fallback: dict = {}

    async def connect(self) -> None:
        if not _REDIS_AVAILABLE:
            _log.warning("redis package not available — using in-memory fallback")
            return
        try:
            self._client = aioredis.from_url(self._url, decode_responses=True)
            await self._client.ping()
            _log.info("Connected to Redis at %s", self._url)
        except Exception as exc:  # noqa: BLE001 — any Redis error triggers in-memory fallback; we log and continue
            _log.warning("Redis unavailable (%s) — using in-memory fallback", exc)
            self._client = None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        payload = json.dumps(value)
        if self._client:
            if ttl:
                await self._client.setex(key, ttl, payload)
            else:
                await self._client.set(key, payload)
        else:
            self._fallback[key] = payload

    async def get(self, key: str) -> Optional[Any]:
        if self._client:
            raw = await self._client.get(key)
        else:
            raw = self._fallback.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def delete(self, key: str) -> None:
        if self._client:
            await self._client.delete(key)
        else:
            self._fallback.pop(key, None)

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
