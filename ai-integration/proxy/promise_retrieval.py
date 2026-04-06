"""
Promise Retrieval Module
Handles retrieval of promises by various criteria
"""
import os
from typing import Optional

from .promise_storage import PromiseRecord, _promise_prune_expired, _load_promise_from_disk, _PROMISES_LOCK, _PROMISES
from .promise_utils import _load_request_snapshot


def get_promise(promise_id: str) -> Optional[PromiseRecord]:
    _promise_prune_expired()
    with _PROMISES_LOCK:
        rec = _PROMISES.get(promise_id)
    if rec is not None:
        return rec
    rec = _load_promise_from_disk(promise_id)
    if rec is None:
        return None
    with _PROMISES_LOCK:
        _PROMISES[promise_id] = rec
    return rec


def get_promise_by_server_id(server_promise_id: str) -> Optional[PromiseRecord]:
    """Find proxy promise by a2a-server's promiseId (X-Server-Promise-Id header)."""
    if not server_promise_id or not server_promise_id.strip():
        return None
    server_promise_id = server_promise_id.strip()
    from .config import PROMISES_DIR
    if not os.path.isdir(PROMISES_DIR):
        return None
    for name in os.listdir(PROMISES_DIR):
        if not name:
            continue
        rec = get_promise(name)
        if not rec:
            continue
        if rec.server_promise_id == server_promise_id:
            return rec
        if not rec.server_promise_id and rec.log_folder:
            snapshot = _load_request_snapshot(rec.log_folder)
            if snapshot:
                headers = snapshot.get('headers') or {}
                hdr_val = (headers.get('X-Server-Promise-Id') or headers.get('x-server-promise-id')) or ''
                if str(hdr_val).strip() == server_promise_id:
                    return rec
    return None