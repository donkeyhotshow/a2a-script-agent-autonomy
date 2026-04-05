"""
Promise Execution Module
Contains logic for executing promises against Ollama in background threads
"""
import os
import base64
import logging
import requests

from .promises import (
    _promise_set_done, _promise_reset_pending, is_llm_upstream_response_ok,
    save_response,
)
from .promise_utils import _sanitize_execute_headers, _prepare_execute_body
from .config import FORWARD_TIMEOUT
from .caching import get_cache

# Setup logger
logger = logging.getLogger(__name__)


def _run_execute_in_background(promise_id: str, rec, request_snapshot: dict) -> None:
    """Execute promise against Ollama in background thread (non-blocking) with caching."""
    try:
        args = dict(request_snapshot.get('args') or {})
        args.pop('promise', None)
        headers = _sanitize_execute_headers(request_snapshot.get('headers') or {})
        body_payload = _prepare_execute_body(request_snapshot.get('body'))

        # Build cache key from target URL and body
        cache = get_cache()
        cache_payload = {
            "url": rec.target_url,
            "method": rec.method,
            "args": args,
            "body": request_snapshot.get('body'),
        }
        cache_key = cache.build_key("ollama", cache_payload)
        
        # Check cache first (reject poisoned entries; same rules as _promise_set_done)
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            body_base64 = cached_response.get('body_base64', '')
            body_bytes = base64.b64decode(body_base64) if body_base64 else b''
            hdrs = cached_response.get('headers', {}) or {}
            ct = hdrs.get('Content-Type') or hdrs.get('content-type') or ''
            sc = int(cached_response.get('status_code', 200))
            if not is_llm_upstream_response_ok(sc, body_bytes, ct):
                logger.warning(
                    'Promise %s: invalid cached LLM payload (not success); invalidating cache',
                    promise_id,
                )
                cache.delete(cache_key)
                cached_response = None
        if cached_response is not None:
            logger.info(f"Promise {promise_id} served from cache")
            body_base64 = cached_response.get('body_base64', '')
            body_bytes = base64.b64decode(body_base64) if body_base64 else b''
            _promise_set_done(
                promise_id,
                status_code=cached_response.get('status_code', 200),
                headers=cached_response.get('headers', {}),
                body=body_bytes
            )
            if rec.log_folder:
                try:
                    save_response(rec.log_folder, {
                        "status_code": cached_response.get('status_code', 200),
                        "headers": cached_response.get('headers', {}),
                        "content": cached_response.get('content', '')[:10000],
                        "cached": True,
                    })
                except Exception as e:
                    logger.debug(f"Failed to save cached response: {e}")
            return

        # Execute request to Ollama
        if rec.method == 'GET':
            resp = requests.get(rec.target_url, params=args, headers=headers, timeout=FORWARD_TIMEOUT)
        elif rec.method == 'POST':
            resp = requests.post(rec.target_url, params=args, headers=headers, data=body_payload, timeout=FORWARD_TIMEOUT)
        elif rec.method == 'PUT':
            resp = requests.put(rec.target_url, params=args, headers=headers, data=body_payload, timeout=FORWARD_TIMEOUT)
        elif rec.method == 'DELETE':
            resp = requests.delete(rec.target_url, params=args, headers=headers, data=body_payload, timeout=FORWARD_TIMEOUT)
        else:
            resp = requests.request(rec.method, rec.target_url, params=args, headers=headers, data=body_payload, timeout=FORWARD_TIMEOUT)

        # Cache only real LLM successes (do not cache 200 + provider error JSON)
        ct = (resp.headers.get('Content-Type') or '') if resp.headers else ''
        if resp.status_code == 200 and is_llm_upstream_response_ok(
            resp.status_code, resp.content or b'', ct
        ):
            body_bytes = resp.content
            cached_value = {
                "status_code": resp.status_code,
                "headers": dict(resp.headers),
                "body_base64": base64.b64encode(body_bytes).decode('utf-8') if body_bytes else '',
                "content": resp.text[:10000] if hasattr(resp, 'text') else '',
            }
            cache.set(cache_key, cached_value)
            logger.info(f"Promise {promise_id} response cached")

        _promise_set_done(promise_id, status_code=resp.status_code, headers=dict(resp.headers), body=resp.content)
        if rec.log_folder:
            try:
                save_response(rec.log_folder, {
                    "status_code": resp.status_code,
                    "headers": dict(resp.headers),
                    "content": resp.text[:10000] if hasattr(resp, 'text') else '',
                })
            except Exception as e:
                logger.debug(f"Failed to save response: {e}")
        logger.info(f"Promise {promise_id} executed in background → {resp.status_code}")
    except requests.RequestException as exc:
        _promise_reset_pending(promise_id, delay_seconds=10.0)
        if rec.log_folder:
            try:
                save_response(rec.log_folder, {"error": "execute_failed", "message": str(exc)})
            except Exception as e:
                logger.debug(f"Failed to save error: {e}")
        logger.error(f"Promise {promise_id} execute failed: {exc}")


