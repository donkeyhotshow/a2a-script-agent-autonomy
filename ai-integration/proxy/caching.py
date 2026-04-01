"""
File-system caching for the AI proxy.

Design:
- L3: file-system cache under STORAGE_DIR/cache (only)
- No TTL - entries never expire
- No in-memory cache (L1 removed)
- No Redis (L2 removed)
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from typing import Any, Dict, Optional

# Setup logger
logger = logging.getLogger(__name__)
from typing import Any, Dict, Optional

from .config import STORAGE_DIR


CACHE_DIR = os.environ.get("CACHE_DIR", os.path.join(STORAGE_DIR, "cache"))


class _FileCache:
    """Simple JSON-on-disk cache (L3) - no TTL."""

    def __init__(self, base_dir: str) -> None:
        self._base_dir = base_dir
        os.makedirs(self._base_dir, exist_ok=True)

    def _path_for(self, key: str) -> str:
        # shard by first two hex chars to avoid huge directories
        shard = key[:2] or "00"
        folder = os.path.join(self._base_dir, shard)
        os.makedirs(folder, exist_ok=True)
        return os.path.join(folder, f"{key}.json")

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        path = self._path_for(key)
        if not os.path.isfile(path):
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                obj = json.load(f)
        except Exception:
            return None
        if not isinstance(obj, dict):
            return None
        value = obj.get("value")
        return value if isinstance(value, dict) else None

    def set(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
        path = self._path_for(key)
        obj = {
            "value": value,
        }
        try:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(obj, f, ensure_ascii=False)
        except Exception:
            return


class ProxyCache:
    """
    File-system only cache (no TTL, no memory cache).
    
    Used for caching responses to /api/v1/generate, /api/v1/embed,
    and promise-based requests to Ollama.
    """

    def __init__(self) -> None:
        self._file = _FileCache(CACHE_DIR)

    @staticmethod
    def build_key(kind: str, payload: Dict[str, Any]) -> str:
        """Build a stable cache key for a request payload."""
        safe_kind = kind.strip() or "generic"
        try:
            data = json.dumps(payload, sort_keys=True, ensure_ascii=False)
        except Exception:
            data = str(payload)
        raw = f"{safe_kind}:{data}".encode("utf-8", errors="replace")
        return hashlib.sha256(raw).hexdigest()

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        # L3 only - file cache
        return self._file.get(key)

    def set(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
        self._file.set(key, value, ttl=ttl)

    def status(self) -> Dict[str, Any]:
        """Return cache backend status for /health."""
        return {"l3_filesystem": True}


_GLOBAL_CACHE = ProxyCache()


def get_cache() -> ProxyCache:
    """Return global cache instance."""
    return _GLOBAL_CACHE
