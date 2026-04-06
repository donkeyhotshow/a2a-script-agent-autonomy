"""
File-system caching for the AI proxy.

Design:
- L3: file-system cache under STORAGE_DIR/cache (only)
- No TTL - entries never expire
- No in-memory cache (L1 removed)
- No Redis (L2 removed)

Cache entry points (keep keys consistent; use helpers below):
- ``proxy/upstream_client.py`` — sync forward: ``build_llm_cache_payload`` + ``LLM`` kind
- ``proxy/promise_execution.forward_promise_with_llm_disk_cache`` / ``try_resolve_promise_from_cache`` — promise pipeline + optional HTTP 200 inline body on cache hit
- ``proxy/daemon.py`` — pending promise worker: same payload builder as above
- ``proxy/routes.py`` — ``/api/v1/generate``, ``/api/v1/embed``: ``build_v1_api_cache_key``
"""

from __future__ import annotations

import copy
import hashlib
import json
import logging
import os
from typing import Any, Dict, Mapping, Optional, Union

# Setup logger
logger = logging.getLogger(__name__)

from .config import STORAGE_DIR

# JSON keys removed from cache-key material (often timestamps / request metadata).
_VOLATILE_CACHE_KEYS = frozenset(
    {
        "timestamp",
        "created",
        "created_at",
        "updated_at",
        "modified_at",
        "completed_at",
        "deleted_at",
        "sent_at",
        "generated_at",
        "published_at",
        "utc_time",
        "wall_time",
        "request_timestamp",
        "client_timestamp",
        "server_time",
        "datetime",
        "date",
        "time",
        "ts",
        "epoch",
        "unix",
        "unix_ms",
        "millis",
        "milliseconds",
        "microseconds",
        "clock",
        "nonce",
        "trace_id",
        "span_id",
        "request_id",
        "client_request_id",
        "idempotency_key",
        # OpenAI-style end-user id — changes per client session but not the prompt
        "user",
    }
)

# Suffix/pattern exceptions: do not strip these *_time keys (not used for wall-clock).
_VOLATILE_CACHE_KEY_SUFFIX_TIME_BLOCKLIST = frozenset(
    {
        "timeout",
        "max_time",
        "compile_time",
        "think_time",
    }
)

LLM_CACHE_KIND = "llm"


def _is_volatile_cache_key(key: object) -> bool:
    if not isinstance(key, str):
        return False
    lk = key.lower()
    if lk in _VOLATILE_CACHE_KEYS:
        return True
    if lk.endswith("_at"):
        return True
    if "timestamp" in lk:
        return True
    if lk.endswith("_time") and lk not in _VOLATILE_CACHE_KEY_SUFFIX_TIME_BLOCKLIST:
        return True
    return False


def _strip_volatile_keys(obj: Any) -> Any:
    if isinstance(obj, dict):
        out: Dict[str, Any] = {}
        for k, v in obj.items():
            if _is_volatile_cache_key(k):
                continue
            out[k] = _strip_volatile_keys(v)
        return out
    if isinstance(obj, list):
        return [_strip_volatile_keys(x) for x in obj]
    return obj


def normalize_body_for_cache(
    body_json: Optional[Any] = None,
    raw_body: Optional[Union[str, bytes]] = None,
) -> Any:
    """
    Parse body if needed, drop `promise`, strip volatile keys so cache hits
    match logically identical prompts despite changing timestamps.
    """
    data: Any = None
    if body_json is not None:
        if isinstance(body_json, dict):
            data = copy.deepcopy(body_json)
        elif isinstance(body_json, list):
            data = copy.deepcopy(body_json)
        else:
            data = body_json
    elif raw_body is not None:
        if isinstance(raw_body, dict):
            data = copy.deepcopy(raw_body)
        elif isinstance(raw_body, (bytes, bytearray)):
            text = raw_body.decode("utf-8", errors="replace").strip()
            if not text:
                return None
            try:
                data = json.loads(text)
            except json.JSONDecodeError as e:
                if text.lstrip().startswith(("{", "[")):
                    logger.warning("normalize_body_for_cache: invalid JSON bytes body: %s", e)
                return text
        elif isinstance(raw_body, str):
            text = raw_body.strip()
            if not text:
                return None
            try:
                data = json.loads(text)
            except json.JSONDecodeError as e:
                if text.lstrip().startswith(("{", "[")):
                    logger.warning("normalize_body_for_cache: invalid JSON str body: %s", e)
                return text
        else:
            data = raw_body
    else:
        return None

    if isinstance(data, dict):
        data.pop("promise", None)
        return _strip_volatile_keys(data)
    if isinstance(data, list):
        return _strip_volatile_keys(data)
    return data


def normalize_forward_args(args: Optional[Mapping[str, Any]]) -> Dict[str, Any]:
    if not args:
        return {}
    out: Dict[str, Any] = {}
    for k, v in args.items():
        if k is None:
            continue
        lk = str(k).lower()
        if lk == "promise" or _is_volatile_cache_key(str(k)):
            continue
        out[str(k)] = v
    return dict(sorted(out.items(), key=lambda kv: kv[0]))


def build_llm_cache_payload(
    *,
    path: str,
    method: str,
    target_url: str,
    forward_args: Optional[Mapping[str, Any]],
    body_json: Optional[Any] = None,
    raw_body: Optional[Union[str, bytes]] = None,
) -> Dict[str, Any]:
    return {
        "path": path or "",
        "method": (method or "GET").upper(),
        "url": target_url or "",
        "args": normalize_forward_args(forward_args),
        "body": normalize_body_for_cache(body_json, raw_body),
    }


def build_llm_cache_key(cache: "ProxyCache", payload: Dict[str, Any]) -> str:
    return cache.build_key(LLM_CACHE_KIND, payload)


def build_v1_api_route_fingerprint(upstream_path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Routing identity for v1 high-level endpoints so entries do not collide across
    providers when the same JSON body is reused.
    """
    p = payload if isinstance(payload, dict) else {}
    model = p.get("model")
    out: Dict[str, Any] = {
        "upstream_path": upstream_path or "",
        "model": str(model if model is not None else ""),
    }
    try:
        from .router_manager import get_router, initialize_router_if_needed

        router = get_router()
        initialize_router_if_needed(router)
        out["default_provider"] = str(getattr(router.config, "default_provider", "") or "")
        if model and getattr(router, "_initialized", False):
            rm = router._resolve_model(model)
            out["model_resolved"] = str(rm)
            chain = router._get_provider_chain(rm)
            if chain:
                pname, prov = chain[0]
                out["provider"] = str(pname)
                out["provider_type"] = str(getattr(prov.config, "type", ""))
            else:
                out["provider"] = "ollama_fallback"
                out["provider_type"] = "ollama"
        else:
            out["model_resolved"] = out["model"]
            out["provider"] = "ollama_fallback"
            out["provider_type"] = "ollama"
    except Exception as exc:
        logger.warning(
            "v1 cache route fingerprint failed (using minimal route id): %s",
            exc,
            exc_info=True,
        )
        out["default_provider"] = ""
        out["model_resolved"] = out["model"]
        out["provider"] = "unknown"
        out["provider_type"] = "unknown"
    return dict(sorted(out.items(), key=lambda kv: kv[0]))


def build_v1_api_cache_key(
    cache: "ProxyCache",
    namespace: str,
    upstream_path: str,
    payload: Dict[str, Any],
) -> str:
    """Single entry point for ``/api/v1/generate`` and ``/api/v1/embed`` cache keys."""
    body = normalize_body_for_cache(body_json=payload)
    route = build_v1_api_route_fingerprint(upstream_path, payload)
    return cache.build_key(namespace, {"body": body, "route": route})


CACHE_DIR = os.environ.get("CACHE_DIR", os.path.join(STORAGE_DIR, "cache"))


def is_valid_llm_disk_cache_value(obj: Any) -> bool:
    """Entry shape from promise/daemon LLM disk cache (see promise_execution.save)."""
    return (
        isinstance(obj, dict)
        and "status_code" in obj
        and "headers" in obj
        and "body_base64" in obj
    )


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
        except Exception as exc:
            logger.warning("cache read failed %s: %s", path, exc, exc_info=True)
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
        except Exception as exc:
            logger.warning("cache write failed %s: %s", path, exc, exc_info=True)
            return

    def delete(self, key: str) -> None:
        path = self._path_for(key)
        try:
            if os.path.isfile(path):
                os.remove(path)
        except Exception as exc:
            logger.warning("cache delete failed %s: %s", path, exc, exc_info=True)
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
        except Exception as exc:
            logger.error("cache key payload not JSON-serializable: %s", exc, exc_info=True)
            raise
        raw = f"{safe_kind}:{data}".encode("utf-8", errors="replace")
        return hashlib.sha256(raw).hexdigest()

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        # L3 only - file cache
        return self._file.get(key)

    def set(self, key: str, value: Dict[str, Any], ttl: Optional[int] = None) -> None:
        self._file.set(key, value, ttl=ttl)

    def delete(self, key: str) -> None:
        """Remove a cache entry (e.g. poisoned 200 + provider error JSON)."""
        self._file.delete(key)

    def status(self) -> Dict[str, Any]:
        """Return cache backend status for /health."""
        return {"l3_filesystem": True}


_GLOBAL_CACHE = ProxyCache()


def get_cache() -> ProxyCache:
    """Return global cache instance."""
    return _GLOBAL_CACHE
