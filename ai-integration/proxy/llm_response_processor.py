"""
LLM Response Processor Module
Handles processing of LLM responses and error detection
"""
import json
from typing import Optional

from .promise_utils import _safe_json_loads


def _provider_error_from_json_body(body: bytes) -> Optional[str]:
    """
    Detect OpenAI/Z.AI/Ollama-style JSON error envelopes returned with HTTP 2xx.
    Some providers use wrong or missing Content-Type; we sniff JSON objects with an `error` key.
    """
    if not body:
        return None
    raw = body
    if raw.startswith(b'\xef\xbb\xbf'):
        raw = raw[3:]
    st = raw.lstrip()
    if not st.startswith(b'{'):
        return None
    parsed = _safe_json_loads(raw)
    if not isinstance(parsed, dict) or 'error' not in parsed:
        return None
    err = parsed.get('error')
    if err is None or err is False:
        return None
    if isinstance(err, dict):
        msg = err.get('message') or err.get('msg') or err.get('code')
        if msg is not None:
            return f"provider_error: {msg}"
        return f"provider_error: {json.dumps(err, ensure_ascii=False)[:800]}"
    if isinstance(err, str):
        if not err.strip():
            return None
        return f"provider_error: {err}"
    return 'provider_error: upstream JSON contains "error" field'


def is_llm_upstream_response_ok(
    status_code: int, body: bytes, content_type: Optional[str]
) -> bool:
    """True if this upstream response must be treated as successful LLM output (promise may complete)."""
    return _llm_upstream_failure_message(status_code, body or b'', content_type) is None


def _llm_upstream_failure_message(status_code: int, body: bytes, content_type: Optional[str]) -> Optional[str]:
    """
    If the upstream response must NOT be treated as a successful LLM completion, return a short message.
    Otherwise return None (caller may mark promise done).
    """
    sc = int(status_code)
    if not (200 <= sc <= 299):
        return _format_upstream_http_error(sc, body, content_type)

    # 2xx: some providers return HTTP 200 with {"error": ...} (wrong/missing Content-Type)
    json_err = _provider_error_from_json_body(body or b'')
    if json_err:
        return json_err
    return None


def _format_upstream_http_error(status_code: int, body: bytes, content_type: Optional[str]) -> str:
    if body and content_type and 'json' in content_type.lower():
        parsed = _safe_json_loads(body)
        if isinstance(parsed, dict):
            err = parsed.get('error')
            if isinstance(err, dict):
                msg = err.get('message') or err.get('msg') or err.get('code')
                if msg is not None:
                    return f"HTTP {status_code}: {msg}"
            if isinstance(err, str):
                return f"HTTP {status_code}: {err}"
            return f"HTTP {status_code}: {json.dumps(parsed, ensure_ascii=False)[:800]}"
    preview = (body[:400] or b'').decode('utf-8', errors='replace')
    return f"HTTP {status_code}: {preview}"