"""Regression: pending queue excludes error; /promises/errors lists failures."""
from __future__ import annotations

import json
import os
import time
import pytest


def _write_promise_meta(base: str, pid: str, **fields) -> None:
    now = time.time()
    meta = {
        "promise_id": pid,
        "status": fields.get("status", "pending"),
        "created_at": float(fields.get("created_at", now)),
        "updated_at": float(fields.get("updated_at", now)),
        "method": "POST",
        "path": "/api/chat",
        "target_url": "http://127.0.0.1:11435/api/chat",
        "log_folder": "",
    }
    if "error" in fields:
        meta["error"] = fields["error"]
    os.makedirs(os.path.join(base, pid), exist_ok=True)
    path = os.path.join(base, pid, "meta.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(meta, f)


@pytest.fixture
def promises_dir(monkeypatch, tmp_path):
    """Fixture to set up PROMISES_DIR for promise_collection and promise_storage modules."""
    base = str(tmp_path / "promises")
    os.makedirs(base, exist_ok=True)
    import proxy.promise_collection as pc
    import proxy.promise_storage as ps
    monkeypatch.setattr(pc, "PROMISES_DIR", base)
    monkeypatch.setattr(ps, "PROMISES_DIR", base)
    return base


def test_collect_pending_excludes_error(promises_dir):
    _write_promise_meta(promises_dir, "p_ok", status="pending")
    _write_promise_meta(promises_dir, "e_bad", status="error", error="upstream failed")

    from proxy.promise_collection import _collect_error_promises, _collect_pending_promises

    assert [r.promise_id for r in _collect_pending_promises()] == ["p_ok"]
    assert [r.promise_id for r in _collect_error_promises()] == ["e_bad"]


def test_promises_errors_route_truncates_and_detail(promises_dir):
    long_err = "E" * 500
    _write_promise_meta(promises_dir, "e_long", status="error", error=long_err)

    from proxy import app as flask_app

    c = flask_app.test_client()
    r = c.get("/promises/errors")
    assert r.status_code == 200
    data = r.get_json()
    assert len(data) == 1
    assert data[0]["promiseId"] == "e_long"
    assert data[0].get("error_truncated") is True
    assert len(data[0]["error"]) <= 410

    r2 = c.get("/promises/errors?detail=1")
    assert r2.status_code == 200
    data2 = r2.get_json()
    assert data2[0]["error"] == long_err
    assert "error_truncated" not in data2[0]
