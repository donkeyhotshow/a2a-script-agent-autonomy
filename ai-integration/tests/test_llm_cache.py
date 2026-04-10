"""LLM proxy cache: key stability and sync check/save alignment."""
from __future__ import annotations

from unittest.mock import Mock
import pytest


@pytest.fixture
def cache_dir(monkeypatch, tmp_path):
    """Fixture to set up CACHE_DIR for proxy.caching module."""
    import proxy.caching as c
    cache_path = str(tmp_path / "cache")
    monkeypatch.setattr(c, "CACHE_DIR", cache_path)
    return cache_path


def test_cache_key_same_when_only_volatile_fields_differ(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c

    pc = c.ProxyCache()
    base = dict(
        path="api/chat",
        method="POST",
        target_url="http://example/v1/chat",
        forward_args={},
    )
    p1 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [{"role": "user", "content": "hi"}],
            "timestamp": 1,
            "request_id": "a",
        },
    )
    p2 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [{"role": "user", "content": "hi"}],
            "timestamp": 999999,
            "request_id": "b",
        },
    )
    assert c.build_llm_cache_key(pc, p1) == c.build_llm_cache_key(pc, p2)


def test_cache_key_ignores_at_suffix_and_user(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c

    pc = c.ProxyCache()
    base = dict(
        path="api/chat",
        method="POST",
        target_url="http://example/v1/chat",
        forward_args={},
    )
    p1 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [{"role": "user", "content": "hi"}],
            "timestamp": 1,
            "request_id": "a",
        },
    )
    p2 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [{"role": "user", "content": "hi"}],
            "timestamp": 999999,
            "request_id": "b",
        },
    )
    assert c.build_llm_cache_key(pc, p1) == c.build_llm_cache_key(pc, p2)


def test_cache_key_ignores_at_suffix_and_user(monkeypatch, tmp_path):
    import proxy.caching as c

    monkeypatch.setattr(c, "CACHE_DIR", str(tmp_path / "cache"))
    pc = c.ProxyCache()
    base = dict(
        path="api/chat",
        method="POST",
        target_url="http://example/v1/chat",
        forward_args={},
    )
    p1 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [{"role": "user", "content": "hi", "meta": {"msg_created_at": "2024-01-01"}}],
            "user": "u1",
        },
    )
    p2 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [{"role": "user", "content": "hi", "meta": {"msg_created_at": "2025-06-06"}}],
            "user": "u2",
        },
    )
    assert c.build_llm_cache_key(pc, p1) == c.build_llm_cache_key(pc, p2)


def test_cache_key_same_when_message_id_noise_differs(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c

    pc = c.ProxyCache()
    base = dict(
        path="api/chat",
        method="POST",
        target_url="http://example/v1/chat",
        forward_args={},
    )
    p1 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [
                {"role": "user", "content": "hi", "id": "msg-a", "message_id": "x"},
            ],
            "options": {"temperature": 0.7, "num_predict": 10},
        },
    )
    p2 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [
                {"role": "user", "content": "hi", "id": "msg-b", "message_id": "y"},
            ],
            "options": {"num_predict": 10, "temperature": 0.7},
        },
    )
    assert c.build_llm_cache_key(pc, p1) == c.build_llm_cache_key(pc, p2)


def test_cache_key_same_when_tools_list_order_differs(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c

    pc = c.ProxyCache()
    base = dict(
        path="api/chat",
        method="POST",
        target_url="http://example/v1/chat",
        forward_args={},
    )
    t_a = {"type": "function", "function": {"name": "alpha", "parameters": {}}}
    t_b = {"type": "function", "function": {"name": "beta", "parameters": {}}}
    p1 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [{"role": "user", "content": "hi"}],
            "tools": [t_b, t_a],
        },
    )
    p2 = c.build_llm_cache_payload(
        **base,
        body_json={
            "model": "glm",
            "messages": [{"role": "user", "content": "hi"}],
            "tools": [t_a, t_b],
        },
    )
    assert c.build_llm_cache_key(pc, p1) == c.build_llm_cache_key(pc, p2)


def test_cache_key_differs_when_prompt_differs(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c

    pc = c.ProxyCache()
    base = dict(
        path="api/chat",
        method="POST",
        target_url="http://example/v1/chat",
        forward_args={},
    )
    p1 = c.build_llm_cache_payload(
        **base,
        body_json={"model": "glm", "messages": [{"role": "user", "content": "a"}]},
    )
    p2 = c.build_llm_cache_payload(
        **base,
        body_json={"model": "glm", "messages": [{"role": "user", "content": "b"}]},
    )
    assert c.build_llm_cache_key(pc, p1) != c.build_llm_cache_key(pc, p2)


def test_sync_save_and_check_use_same_key_volatile_ignored(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c
    import proxy.upstream_client as uc

    isolated = c.ProxyCache()
    monkeypatch.setattr(uc, "get_cache", lambda: isolated)

    path, url = "api/chat", "http://z/v1/chat/completions"
    body_save = {
        "model": "glm",
        "messages": [{"role": "user", "content": "ping"}],
        "timestamp": 100,
    }
    assert uc.check_cache(path, "POST", url, {}, body_save) is None

    resp = Mock()
    resp.status_code = 200
    resp.content = b'{"id":"ok","choices":[]}'
    resp.text = '{"id":"ok","choices":[]}'
    resp.headers = {"Content-Type": "application/json"}
    uc.save_to_cache(path, "POST", url, {}, body_save, resp)

    body_check = {
        "model": "glm",
        "messages": [{"role": "user", "content": "ping"}],
        "timestamp": 200,
    }
    hit = uc.check_cache(path, "POST", url, {}, body_check)
    assert hit is not None
    assert hit.get("status") == 200
    assert "ok" in hit.get("body", "")


def test_v1_generate_embed_cache_keys_ignore_volatile_fields(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c

    pc = c.ProxyCache()

    def _fixed_route(up_path: str, pl: dict) -> dict:
        return dict(
            sorted(
                {
                    "default_provider": "z_ai",
                    "model": str(pl.get("model") or ""),
                    "model_resolved": str(pl.get("model") or ""),
                    "provider": "z_ai",
                    "provider_type": "z_ai",
                    "upstream_path": up_path,
                }.items(),
                key=lambda kv: kv[0],
            )
        )

    monkeypatch.setattr(c, "build_v1_api_route_fingerprint", _fixed_route)
    for kind, path in (("generate", "api/generate"), ("embed", "api/embeddings")):
        k1 = c.build_v1_api_cache_key(
            pc, kind, path, {"model": "m", "prompt": "x", "timestamp": 1}
        )
        k2 = c.build_v1_api_cache_key(
            pc, kind, path, {"model": "m", "prompt": "x", "timestamp": 99}
        )
        assert k1 == k2


def test_v1_cache_key_splits_on_route_fingerprint(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c

    pc = c.ProxyCache()
    bodies = {"model": "m", "prompt": "x"}

    def route_a(up_path: str, pl: dict) -> dict:
        return {"upstream_path": up_path, "provider": "a"}

    def route_b(up_path: str, pl: dict) -> dict:
        return {"upstream_path": up_path, "provider": "b"}

    monkeypatch.setattr(c, "build_v1_api_route_fingerprint", route_a)
    ka = c.build_v1_api_cache_key(pc, "generate", "api/generate", bodies)
    monkeypatch.setattr(c, "build_v1_api_route_fingerprint", route_b)
    kb = c.build_v1_api_cache_key(pc, "generate", "api/generate", bodies)
    assert ka != kb


def test_raw_body_string_parsed_like_json_for_key(monkeypatch, tmp_path, cache_dir):
    import proxy.caching as c

    pc = c.ProxyCache()
    import json

    inner = {"model": "m", "messages": [], "timestamp": 5}
    raw = json.dumps(inner)
    p1 = c.build_llm_cache_payload(
        path="api/chat",
        method="POST",
        target_url="http://u",
        forward_args={},
        raw_body=raw,
    )
    inner2 = dict(inner)
    inner2["timestamp"] = 6
    p2 = c.build_llm_cache_payload(
        path="api/chat",
        method="POST",
        target_url="http://u",
        forward_args={},
        raw_body=json.dumps(inner2),
    )
    assert c.build_llm_cache_key(pc, p1) == c.build_llm_cache_key(pc, p2)
