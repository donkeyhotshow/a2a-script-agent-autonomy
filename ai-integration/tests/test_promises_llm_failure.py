"""Tests for promise completion rules: LLM error responses must not mark promise done."""
import json

from proxy.promises import (
    _llm_upstream_failure_message,
    _provider_error_from_json_body,
    is_llm_upstream_response_ok,
)


def test_http_401_is_failure():
    body = json.dumps({"error": {"message": "auth"}}).encode()
    msg = _llm_upstream_failure_message(401, body, "application/json")
    assert msg is not None
    assert "401" in msg or "auth" in msg


def test_http_200_with_error_json_is_failure():
    body = json.dumps(
        {"error": {"code": "1001", "message": "Authentication parameter not received"}}
    ).encode()
    assert _provider_error_from_json_body(body) is not None
    msg = _llm_upstream_failure_message(200, body, "text/plain")
    assert msg is not None
    assert "provider_error" in msg


def test_http_200_with_error_json_no_content_type_still_detected():
    body = json.dumps({"error": "rate limit"}).encode()
    msg = _llm_upstream_failure_message(200, body, None)
    assert msg is not None


def test_http_200_valid_completion_is_ok():
    body = json.dumps(
        {
            "choices": [
                {"message": {"role": "assistant", "content": "hello"}},
            ]
        }
    ).encode()
    assert is_llm_upstream_response_ok(200, body, "application/json") is True


def test_http_200_error_null_is_ok():
    body = json.dumps({"choices": [], "error": None}).encode()
    assert _provider_error_from_json_body(body) is None
    assert is_llm_upstream_response_ok(200, body, "application/json") is True


def test_poisoned_sync_cache_entry_would_not_pass_ok_gate():
    """Mirrors proxy_handler cache shape: status + body text; 200 + error JSON must fail the gate."""
    err = json.dumps({"error": {"code": "1302", "message": "Rate limit"}}).encode()
    assert is_llm_upstream_response_ok(200, err, "application/json") is False


