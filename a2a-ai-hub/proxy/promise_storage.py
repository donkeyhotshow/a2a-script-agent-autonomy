"""
Promise Storage Module
Handles storage, saving, loading, and pruning of promises
"""
import os
import uuid
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, asdict
from typing import Any, Optional

from .config import PROMISES_DIR, PROMISE_TTL_SECONDS, PROMISE_MAX_WORKERS
from .promise_utils import _read_json_file, _write_json_file

# Setup logger
logger = logging.getLogger(__name__)

@dataclass
class PromiseRecord:
    promise_id: str
    status: str  # pending|done|error
    created_at: float
    updated_at: float
    method: str
    path: str
    target_url: str
    log_folder: str
    simulate: Optional[dict] = None  # simulate config to use instead of real request
    server_promise_id: Optional[str] = None  # X-Server-Promise-Id from a2a-server for recovery
    result_status_code: Optional[int] = None
    result_headers: Optional[dict] = None
    result_content_type: Optional[str] = None
    result_body_path: Optional[str] = None
    result_formatted_body_path: Optional[str] = None  # Formatted markdown version of response
    error: Optional[str] = None
    next_attempt_at: Optional[float] = None  # Timestamp when next attempt can be made


_PROMISES_LOCK = __import__('threading').Lock()
_PROMISES: dict[str, PromiseRecord] = {}
_PROMISE_EXECUTOR = ThreadPoolExecutor(max_workers=PROMISE_MAX_WORKERS)
# Full-directory prune on every get_promise() caused O(n²) when listing /promises/pending with many dirs.
_PROMISE_PRUNE_LAST = 0.0


def _prune_interval_seconds() -> float:
    try:
        return float(os.environ.get('PROMISE_PRUNE_INTERVAL_SECONDS', '60'))
    except ValueError:
        return 60.0


def _maybe_prune_expired() -> None:
    """TTL prune: at most once per PROMISE_PRUNE_INTERVAL_SECONDS (default 60). Set interval <= 0 to run every call."""
    global _PROMISE_PRUNE_LAST
    interval = _prune_interval_seconds()
    if interval <= 0:
        _promise_prune_expired()
        return
    now = time.time()
    if now - _PROMISE_PRUNE_LAST < interval:
        return
    _PROMISE_PRUNE_LAST = now
    _promise_prune_expired()


def _promise_folder(promise_id: str) -> str:
    return os.path.join(PROMISES_DIR, promise_id)


def _promise_meta_path(promise_id: str) -> str:
    return os.path.join(_promise_folder(promise_id), 'meta.json')


def _promise_body_path(promise_id: str) -> str:
    return os.path.join(_promise_folder(promise_id), 'body.md')


def _promise_prune_expired() -> None:
    if PROMISE_TTL_SECONDS <= 0:
        return
    cutoff = time.time() - PROMISE_TTL_SECONDS
    with _PROMISES_LOCK:
        expired_ids = [pid for pid, rec in _PROMISES.items() if rec.updated_at < cutoff]
        for pid in expired_ids:
            _PROMISES.pop(pid, None)
    # Disk cleanup (best-effort)
    try:
        if not os.path.isdir(PROMISES_DIR):
            return
        for name in os.listdir(PROMISES_DIR):
            folder = os.path.join(PROMISES_DIR, name)
            meta = _read_json_file(os.path.join(folder, 'meta.json'))
            if not meta:
                continue
            updated_at = meta.get('updated_at')
            try:
                updated_at = float(updated_at) if updated_at is not None else 0.0
            except (TypeError, ValueError) as e:
                logger.warning("promise meta updated_at invalid in %s: %s", folder, e)
                continue
            if updated_at < cutoff:
                try:
                    for fn in os.listdir(folder):
                        os.remove(os.path.join(folder, fn))
                    os.rmdir(folder)
                except OSError as e:
                    logger.warning("Failed to cleanup folder %s: %s", folder, e, exc_info=True)
    except OSError as e:
        logger.warning("Failed to cleanup promises directory: %s", e, exc_info=True)


def _load_promise_from_disk(promise_id: str) -> Optional[PromiseRecord]:
    meta = _read_json_file(_promise_meta_path(promise_id))
    if not meta:
        return None
    try:
        rec = PromiseRecord(
            promise_id=promise_id,
            status=str(meta.get('status', 'pending')),
            created_at=float(meta.get('created_at', 0.0)),
            updated_at=float(meta.get('updated_at', 0.0)),
            method=str(meta.get('method', '')),
            path=str(meta.get('path', '')),
            target_url=str(meta.get('target_url', '')),
            log_folder=str(meta.get('log_folder', '')),
            server_promise_id=meta.get('server_promise_id'),
            result_status_code=meta.get('result_status_code'),
            result_headers=meta.get('result_headers'),
            result_content_type=meta.get('result_content_type'),
            result_body_path=meta.get('result_body_path'),
            result_formatted_body_path=meta.get('result_formatted_body_path'),
            error=meta.get('error'),
            next_attempt_at=meta.get('next_attempt_at'),
        )
        return rec
    except (TypeError, ValueError, KeyError) as e:
        logger.warning("corrupt promise meta for %s: %s", promise_id, e, exc_info=True)
        return None


def _save_promise(rec: PromiseRecord) -> None:
    data = asdict(rec)
    _write_json_file(_promise_meta_path(rec.promise_id), data)


def create_promise(*, method: str, path: str, target_url: str, log_folder: str, simulate: Optional[dict] = None, server_promise_id: Optional[str] = None) -> PromiseRecord:
    os.makedirs(PROMISES_DIR, exist_ok=True)
    promise_id = uuid.uuid4().hex
    now = time.time()
    rec = PromiseRecord(
        promise_id=promise_id,
        status='pending',
        created_at=now,
        updated_at=now,
        method=method,
        path=path,
        target_url=target_url,
        log_folder=log_folder,
        simulate=simulate,
        server_promise_id=server_promise_id,
        result_formatted_body_path=None,
    )
    os.makedirs(_promise_folder(promise_id), exist_ok=True)
    _save_promise(rec)
    with _PROMISES_LOCK:
        _PROMISES[promise_id] = rec
    return rec


def _delete_promise(promise_id: str) -> bool:
    """Remove promise from memory and delete its on-disk folder."""
    with _PROMISES_LOCK:
        _PROMISES.pop(promise_id, None)
    folder = _promise_folder(promise_id)
    if not os.path.isdir(folder):
        return False
    try:
        for fn in os.listdir(folder):
            try:
                os.remove(os.path.join(folder, fn))
            except OSError as e:
                logger.warning("Failed to remove %s/%s: %s", folder, fn, e, exc_info=True)
        os.rmdir(folder)
        return True
    except OSError as e:
        logger.warning("Failed to delete promise folder %s: %s", folder, e, exc_info=True)
        return False