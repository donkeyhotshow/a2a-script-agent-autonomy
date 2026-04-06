"""
Upstream Client Module
Handles forwarding requests to upstream servers (Ollama or external providers)
"""
import logging
import requests
from typing import Optional, Any, Dict, Mapping

logger = logging.getLogger(__name__)

from .config import FORWARD_TIMEOUT
from .api_key_routing import forward_with_api_key_failover
from .caching import (
    get_cache,
    build_llm_cache_payload,
    build_llm_cache_key,
    llm_disk_cache_log,
)
from .promises import is_llm_upstream_response_ok, _json_bytes


def forward_request(
    method: str,
    target_url: str,
    body: Optional[bytes],
    forward_args: Dict[str, Any],
    headers: Dict[str, Any],
    routed_provider_name: Optional[str],
    routed_provider_type: Optional[str],
    router_config,
) -> requests.Response:
    """
    Forward request to upstream server.
    """
    if routed_provider_name is not None and routed_provider_type is not None:
        resp, _ = forward_with_api_key_failover(
            method=method,
            target_url=target_url,
            body=body,
            forward_args=forward_args,
            base_header_subset=headers,
            provider_name=routed_provider_name,
            provider_type=routed_provider_type,
            timeout=FORWARD_TIMEOUT,
            cfg=router_config,
        )
    elif method == 'GET':
        resp = requests.get(target_url, params=forward_args, headers=headers, timeout=FORWARD_TIMEOUT)
    elif method == 'POST':
        resp = requests.post(target_url, data=body, headers=headers, timeout=FORWARD_TIMEOUT, stream=False)
    elif method == 'PUT':
        resp = requests.put(target_url, data=body, headers=headers, timeout=FORWARD_TIMEOUT)
    elif method == 'DELETE':
        resp = requests.delete(target_url, headers=headers, timeout=FORWARD_TIMEOUT)
    else:
        resp = requests.request(method, target_url, data=body, headers=headers, timeout=FORWARD_TIMEOUT)

    # Normalize upstream auth error code
    if resp.status_code == 401 and resp.headers.get('Content-Type', '').startswith('application/json'):
        try:
            err_obj = resp.json()
        except Exception as exc:
            logger.warning(
                "401 response body not JSON, skip auth code patch: %s",
                exc,
                exc_info=True,
            )
            err_obj = None
        if isinstance(err_obj, dict):
            err = err_obj.get('error') or {}
            if isinstance(err, dict) and str(err.get('code')) == '1001':
                err['code'] = 'upstream_auth_failed'
                err.setdefault('message', 'Upstream authentication failed')
                err_obj['error'] = err
                patched_body = _json_bytes(err_obj)
                # Patch resp for downstream logging/forwarding
                resp._content = patched_body
                resp.headers['Content-Length'] = str(len(patched_body))

    return resp


def _llm_cache_key(
    path: str,
    method: str,
    target_url: str,
    forward_args: Optional[Mapping[str, Any]],
    body_json: Optional[Dict[str, Any]],
) -> str:
    cache = get_cache()
    payload = build_llm_cache_payload(
        path=path,
        method=method,
        target_url=target_url,
        forward_args=forward_args,
        body_json=body_json,
    )
    return build_llm_cache_key(cache, payload)


def check_cache(
    path: str,
    method: str,
    target_url: str,
    forward_args: Optional[Mapping[str, Any]],
    body_json: Optional[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """
    Check cache for existing response (sync forward path).
    """
    cache = get_cache()
    cache_key_full = _llm_cache_key(path, method, target_url, forward_args, body_json)

    cached = cache.get(cache_key_full)
    if cached:
        if not isinstance(cached, dict) or "status" not in cached or "body" not in cached:
            logger.warning(
                "Rejecting malformed sync LLM cache entry (missing keys); key=%s...",
                cache_key_full[:16],
            )
            cache.delete(cache_key_full)
            llm_disk_cache_log("miss", path=path, stage="sync", cache_key=cache_key_full)
            return None
        body_text = cached["body"]
        body_b = body_text.encode('utf-8') if isinstance(body_text, str) else (body_text or b'')
        st = int(cached["status"])
        if is_llm_upstream_response_ok(st, body_b, 'application/json'):
            logger.debug(f"Cache hit for key: {cache_key_full[:16]}...")
            llm_disk_cache_log("hit", path=path, stage="sync", cache_key=cache_key_full)
            return cached
        logger.warning(
            'Rejecting cached response: not a valid LLM success (invalidating key %s...)',
            cache_key_full[:16],
        )
        cache.delete(cache_key_full)
    llm_disk_cache_log("miss", path=path, stage="sync", cache_key=cache_key_full)
    return None


def save_to_cache(
    path: str,
    method: str,
    target_url: str,
    forward_args: Optional[Mapping[str, Any]],
    body_json: Optional[Dict[str, Any]],
    resp: requests.Response,
) -> None:
    """
    Save response to cache if it's a valid LLM success (same key material as check_cache).
    """
    cache = get_cache()
    cache_key_full = _llm_cache_key(path, method, target_url, forward_args, body_json)

    if resp.status_code == 200:
        ct = (resp.headers.get('Content-Type') or '') if resp.headers else ''
        if is_llm_upstream_response_ok(resp.status_code, resp.content or b'', ct):
            cache.set(cache_key_full, {"status": resp.status_code, "body": resp.text})
            logger.debug(f"Cached response for key: {cache_key_full[:16]}...")
            llm_disk_cache_log("store", path=path, stage="sync", cache_key=cache_key_full)
        else:
            logger.warning(
                'Not caching upstream response: LLM failure payload (status=%s key=%s...)',
                resp.status_code,
                cache_key_full[:16],
            )
