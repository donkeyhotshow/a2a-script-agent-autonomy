"""
API key pool: each key has id + provider; Ollama uses a placeholder secret (no Bearer).
Rate-limit responses trigger failover to the next key for the same provider.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Callable, Optional, Tuple

import requests

from .providers.config_loader import (
    OLLAMA_API_KEY_PLACEHOLDER,
    ProvidersConfig,
    load_providers_config,
)

logger = logging.getLogger(__name__)


def is_ollama_placeholder(secret: Optional[str]) -> bool:
    if not secret:
        return True
    s = str(secret).strip()
    return s == OLLAMA_API_KEY_PLACEHOLDER or s == ""


def is_upstream_rate_limited(
    status_code: int,
    body: bytes,
    content_type: Optional[str],
) -> bool:
    if status_code == 429:
        return True
    if status_code == 503:
        ct = (content_type or "").lower()
        if body and "json" in ct:
            try:
                parsed = json.loads(body.decode("utf-8", errors="replace"))
            except json.JSONDecodeError as e:
                logger.debug(
                    "is_upstream_rate_limited: JSON parse failed for 503 body (ct=%s): %s",
                    content_type,
                    e,
                )
                return False
            if isinstance(parsed, dict):
                err = parsed.get("error")
                if isinstance(err, dict):
                    code = str(err.get("code") or "")
                    msg = str(err.get("message") or err.get("msg") or "").lower()
                    if code == "1302" or "rate limit" in msg:
                        return True
                elif isinstance(err, str) and "rate limit" in err.lower():
                    return True
    if status_code >= 400 and body:
        ct = (content_type or "").lower()
        if "json" in ct:
            try:
                parsed = json.loads(body.decode("utf-8", errors="replace"))
            except json.JSONDecodeError as e:
                logger.debug(
                    "is_upstream_rate_limited: JSON parse failed for error body (ct=%s): %s",
                    content_type,
                    e,
                )
                return False
            if isinstance(parsed, dict):
                err = parsed.get("error")
                if isinstance(err, dict):
                    code = str(err.get("code") or "")
                    msg = str(err.get("message") or err.get("msg") or "").lower()
                    if code == "1302" or "rate limit" in msg or "too many requests" in msg:
                        return True
    return False


def _merge_upstream_headers(base: dict[str, Any], bearer: Optional[str]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for hk, hv in (base or {}).items():
        lk = str(hk).lower()
        if lk in ("authorization", "api-key"):
            continue
        out[hk] = hv
    if bearer:
        out["Authorization"] = f"Bearer {bearer}"
    return out


def get_api_keys_for_provider(
    cfg: ProvidersConfig,
    provider_name: str,
) -> list:
    """Delegate to ProvidersConfig."""
    return cfg.get_api_keys_for_provider(provider_name)


def _do_http(
    method: str,
    url: str,
    *,
    body: Optional[bytes],
    headers: dict[str, Any],
    params: dict[str, Any],
    timeout: Any,
) -> requests.Response:
    m = method.upper()
    if m == "GET":
        return requests.get(url, params=params, headers=headers, timeout=timeout)
    if m == "POST":
        return requests.post(url, data=body, headers=headers, timeout=timeout, stream=False)
    if m == "PUT":
        return requests.put(url, data=body, headers=headers, timeout=timeout)
    if m == "DELETE":
        return requests.delete(url, headers=headers, timeout=timeout)
    return requests.request(m, url, data=body, headers=headers, params=params, timeout=timeout)


def forward_with_api_key_failover(
    *,
    method: str,
    target_url: str,
    body: Optional[bytes],
    forward_args: Optional[dict[str, Any]],
    base_header_subset: dict[str, Any],
    provider_name: str,
    provider_type: str,
    timeout: Any,
    cfg: Optional[ProvidersConfig] = None,
    request_fn: Optional[Callable[..., requests.Response]] = None,
) -> Tuple[requests.Response, Optional[str]]:
    """
    Try each API key for provider_name until a non-rate-limited response or keys exhausted.
    Returns (last_response, api_key_id_used or None).
    """
    cfg = cfg or load_providers_config()
    keys = get_api_keys_for_provider(cfg, provider_name)
    req = request_fn or _do_http

    if provider_type == "ollama":
        hdr = _merge_upstream_headers(base_header_subset, None)
        resp = req(method, target_url, body=body, headers=hdr, params=forward_args or {}, timeout=timeout)
        oid = keys[0].id if keys else "ollama-local"
        return resp, oid

    if not keys:
        hdr = dict(base_header_subset)
        resp = req(method, target_url, body=body, headers=hdr, params=forward_args or {}, timeout=timeout)
        return resp, None

    last: Optional[requests.Response] = None
    for entry in keys:
        secret = entry.secret
        if is_ollama_placeholder(secret):
            hdr = _merge_upstream_headers(base_header_subset, None)
        else:
            hdr = _merge_upstream_headers(base_header_subset, secret)
        resp = req(method, target_url, body=body, headers=hdr, params=forward_args or {}, timeout=timeout)
        last = resp
        ct = resp.headers.get("Content-Type")
        if not is_upstream_rate_limited(resp.status_code, resp.content, ct):
            return resp, entry.id
        logger.warning(
            "upstream rate limit for provider=%s api_key_id=%s status=%s",
            provider_name,
            entry.id,
            resp.status_code,
        )
    return last, None


def write_routing_hint(
    folder_path: str,
    *,
    provider_name: str,
    provider_type: str,
    key_failover: bool,
) -> None:
    if not folder_path:
        return
    try:
        from .promises import _write_json_file

        path = os.path.join(folder_path, "routing.json")
        _write_json_file(
            path,
            {
                "provider": provider_name,
                "provider_type": provider_type,
                "upstream_key_failover": key_failover,
            },
        )
    except Exception as e:
        logger.warning("write_routing_hint failed: %s", e, exc_info=True)


def load_routing_hint(folder_path: str) -> Optional[dict[str, Any]]:
    if not folder_path:
        return None
    try:
        import json as _json

        path = os.path.join(folder_path, "routing.json")
        if not os.path.isfile(path):
            return None
        with open(path, "r", encoding="utf-8") as f:
            data = _json.load(f)
        return data if isinstance(data, dict) else None
    except Exception as exc:
        logger.warning("load_routing_hint failed %s: %s", folder_path, exc, exc_info=True)
        return None
