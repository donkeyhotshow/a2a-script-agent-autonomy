"""
Promise Execution Module
Contains logic for executing promises against Local LLM upstream in background threads
"""
from __future__ import annotations

import base64
import logging
from typing import Any, Dict, Optional, Tuple

import requests

from .promises import (
    _promise_set_done, _promise_reset_pending, is_llm_upstream_response_ok,
    save_response,
)
from .promise_utils import _sanitize_execute_headers, _prepare_execute_body
from .config import FORWARD_TIMEOUT
from .caching import (
    get_cache,
    build_llm_cache_payload,
    build_llm_cache_key,
    is_valid_llm_disk_cache_value,
    llm_disk_cache_log,
)
from .api_key_routing import forward_with_api_key_failover

# Setup logger
logger = logging.getLogger(__name__)


def try_resolve_promise_from_cache(
    *,
    path: str,
    method: str,
    target_url: str,
    body_for_prepare: Any,
    args: Dict[str, Any],
    headers: Dict[str, Any],
    body_json: Optional[Dict[str, Any]],
    routed_provider_name: Optional[str],
    routed_provider_type: Optional[str],
    router_config: Any,
) -> Optional[Tuple[int, dict, bytes]]:
    """
    If the LLM disk cache (or legacy sync {status, body} entry) has a valid success payload,
    return (status_code, headers, body_bytes). Otherwise None.
    """
    args = dict(args or {})
    args.pop("promise", None)
    headers = _sanitize_execute_headers(headers or {})

    raw_body_cache = None
    if body_json is None:
        if isinstance(body_for_prepare, (bytes, bytearray)):
            raw_body_cache = body_for_prepare.decode("utf-8", errors="replace")
        elif body_for_prepare is not None:
            raw_body_cache = body_for_prepare

    cache = get_cache()
    cache_payload = build_llm_cache_payload(
        path=str(path or ""),
        method=method,
        target_url=target_url,
        forward_args=args,
        body_json=body_json,
        raw_body=raw_body_cache,
    )
    cache_key = build_llm_cache_key(cache, cache_payload)

    cached_response = cache.get(cache_key)
    if cached_response is not None and not is_valid_llm_disk_cache_value(cached_response):
        if isinstance(cached_response, dict) and "status" in cached_response and "body" in cached_response:
            pass  # legacy sync shape — handled below
        else:
            logger.warning("Cache key malformed; invalidating")
            cache.delete(cache_key)
            cached_response = None

    if cached_response is not None and is_valid_llm_disk_cache_value(cached_response):
        body_base64 = cached_response["body_base64"]
        body_bytes = base64.b64decode(body_base64) if body_base64 else b""
        hdrs = cached_response["headers"] or {}
        ct = hdrs.get("Content-Type") or hdrs.get("content-type") or ""
        sc = int(cached_response["status_code"])
        if not is_llm_upstream_response_ok(sc, body_bytes, ct):
            logger.warning("Disk cache invalid LLM payload; invalidating")
            cache.delete(cache_key)
            llm_disk_cache_log("miss", path=path, stage="promise_inline", cache_key=cache_key)
            return None
        llm_disk_cache_log("hit", path=path, stage="promise_inline", cache_key=cache_key)
        return (sc, dict(hdrs), body_bytes)

    if isinstance(cached_response, dict) and "status" in cached_response and "body" in cached_response:
        if "body_base64" in cached_response:
            llm_disk_cache_log("miss", path=path, stage="promise_inline", cache_key=cache_key)
            return None
        body_text = cached_response["body"]
        body_bytes = body_text.encode("utf-8") if isinstance(body_text, str) else (body_text or b"")
        sc = int(cached_response["status"])
        ct = "application/json"
        if not is_llm_upstream_response_ok(sc, body_bytes, ct):
            llm_disk_cache_log("miss", path=path, stage="promise_inline", cache_key=cache_key)
            return None
        llm_disk_cache_log("hit", path=path, stage="promise_inline", cache_key=cache_key)
        return (sc, {"Content-Type": ct}, body_bytes)

    llm_disk_cache_log("miss", path=path, stage="promise_inline", cache_key=cache_key)
    return None


def forward_promise_with_llm_disk_cache(
    *,
    promise_id: str,
    path: str,
    method: str,
    target_url: str,
    body_for_prepare: Any,
    args: Dict[str, Any],
    headers: Dict[str, Any],
    body_json: Optional[Dict[str, Any]],
    routed_provider_name: Optional[str],
    routed_provider_type: Optional[str],
    router_config: Any,
    want_trace: bool,
    trace_dir: str,
) -> None:
    """
    Forward to upstream with the same disk cache as sync / daemon paths.
    Used by proxy-handler promises and by /promise/... execute threads.
    """
    try:
        args = dict(args or {})
        args.pop("promise", None)
        headers = _sanitize_execute_headers(headers or {})

        raw_body_cache = None
        if body_json is None:
            if isinstance(body_for_prepare, (bytes, bytearray)):
                raw_body_cache = body_for_prepare.decode("utf-8", errors="replace")
            elif body_for_prepare is not None:
                raw_body_cache = body_for_prepare

        cache = get_cache()
        cache_payload = build_llm_cache_payload(
            path=str(path or ""),
            method=method,
            target_url=target_url,
            forward_args=args,
            body_json=body_json,
            raw_body=raw_body_cache,
        )
        cache_key = build_llm_cache_key(cache, cache_payload)

        body_payload = _prepare_execute_body(body_for_prepare)

        cached_response = cache.get(cache_key)
        if cached_response is not None and not is_valid_llm_disk_cache_value(cached_response):
            logger.warning(
                "Promise %s: disk cache entry malformed; invalidating",
                promise_id,
            )
            cache.delete(cache_key)
            cached_response = None
        if cached_response is not None:
            body_base64 = cached_response["body_base64"]
            body_bytes = base64.b64decode(body_base64) if body_base64 else b""
            hdrs = cached_response["headers"] or {}
            ct = hdrs.get("Content-Type") or hdrs.get("content-type") or ""
            sc = int(cached_response["status_code"])
            if not is_llm_upstream_response_ok(sc, body_bytes, ct):
                logger.warning(
                    "Promise %s: invalid cached LLM payload (not success); invalidating cache",
                    promise_id,
                )
                cache.delete(cache_key)
                cached_response = None
        if cached_response is not None:
            logger.info("Promise %s served from cache", promise_id)
            llm_disk_cache_log("hit", path=path, stage="promise_bg", cache_key=cache_key)
            body_base64 = cached_response["body_base64"]
            body_bytes = base64.b64decode(body_base64) if body_base64 else b""
            _promise_set_done(
                promise_id,
                status_code=int(cached_response["status_code"]),
                headers=cached_response["headers"],
                body=body_bytes,
            )
            if want_trace and trace_dir:
                try:
                    save_response(
                        trace_dir,
                        {
                            "status_code": cached_response["status_code"],
                            "headers": cached_response["headers"],
                            "content": str(cached_response.get("content", ""))[:10000],
                            "cached": True,
                        },
                    )
                except Exception as e:
                    logger.warning("Failed to save cached response: %s", e, exc_info=True)
            return

        llm_disk_cache_log("miss", path=path, stage="promise_bg", cache_key=cache_key)

        if routed_provider_name is not None and routed_provider_type is not None:
            resp, _ = forward_with_api_key_failover(
                method=method,
                target_url=target_url,
                body=body_payload,
                forward_args=args,
                base_header_subset=headers,
                provider_name=routed_provider_name,
                provider_type=routed_provider_type,
                timeout=FORWARD_TIMEOUT,
                cfg=router_config,
            )
        else:
            if method == "GET":
                resp = requests.get(
                    target_url, params=args, headers=headers, timeout=FORWARD_TIMEOUT
                )
            elif method == "POST":
                resp = requests.post(
                    target_url,
                    params=args,
                    headers=headers,
                    data=body_payload,
                    timeout=FORWARD_TIMEOUT,
                    stream=False,
                )
            elif method == "PUT":
                resp = requests.put(
                    target_url,
                    params=args,
                    headers=headers,
                    data=body_payload,
                    timeout=FORWARD_TIMEOUT,
                )
            elif method == "DELETE":
                resp = requests.delete(
                    target_url, params=args, headers=headers, timeout=FORWARD_TIMEOUT
                )
            else:
                resp = requests.request(
                    method,
                    target_url,
                    params=args,
                    headers=headers,
                    data=body_payload,
                    timeout=FORWARD_TIMEOUT,
                )

        ct = (resp.headers.get("Content-Type") or "") if resp.headers else ""
        if resp.status_code == 200 and is_llm_upstream_response_ok(
            resp.status_code, resp.content or b"", ct
        ):
            body_bytes = resp.content
            cached_value = {
                "status_code": resp.status_code,
                "headers": dict(resp.headers),
                "body_base64": base64.b64encode(body_bytes).decode("utf-8")
                if body_bytes
                else "",
                "content": resp.text[:10000] if hasattr(resp, "text") else "",
            }
            cache.set(cache_key, cached_value)
            logger.info("Promise %s response cached", promise_id)
            llm_disk_cache_log("store", path=path, stage="promise_bg", cache_key=cache_key)

        _promise_set_done(
            promise_id,
            status_code=resp.status_code,
            headers=dict(resp.headers),
            body=resp.content,
        )
        if want_trace and trace_dir:
            try:
                save_response(
                    trace_dir,
                    {
                        "status_code": resp.status_code,
                        "headers": dict(resp.headers),
                        "content": resp.text[:10000]
                        if hasattr(resp, "text")
                        else "",
                        "promised": True,
                    },
                )
            except Exception as e:
                logger.warning("Failed to save response: %s", e, exc_info=True)
        logger.info("Promise %s executed in background → %s", promise_id, resp.status_code)
    except requests.RequestException as exc:
        _promise_reset_pending(promise_id, delay_seconds=10.0)
        if want_trace and trace_dir:
            try:
                save_response(
                    trace_dir, {"error": "execute_failed", "message": str(exc)}
                )
            except Exception as e:
                logger.warning("Failed to save error: %s", e, exc_info=True)
        logger.error("Promise %s execute failed: %s", promise_id, exc)


def _run_execute_in_background(promise_id: str, rec, request_snapshot: dict) -> None:
    """Execute promise from stored request snapshot (API/UI execute) with disk cache."""
    forward_promise_with_llm_disk_cache(
        promise_id=promise_id,
        path=str(request_snapshot.get("path") or ""),
        method=rec.method,
        target_url=rec.target_url,
        body_for_prepare=request_snapshot.get("body"),
        args=dict(request_snapshot.get("args") or {}),
        headers=request_snapshot.get("headers") or {},
        body_json=None,
        routed_provider_name=None,
        routed_provider_type=None,
        router_config=None,
        want_trace=bool(rec.log_folder),
        trace_dir=rec.log_folder or "",
    )
