"""
Promise Collection Module
Handles collection of promises by status and criteria
"""
import logging
import os

logger = logging.getLogger(__name__)

from .promise_storage import PromiseRecord, _load_promise_from_disk, _maybe_prune_expired
from .config import PROMISES_DIR


def _collect_pending_promises() -> list[PromiseRecord]:
    """Collect promises queued for automatic execution: ``pending`` only.

    ``error`` rows are not auto-retried; use ``POST /promise/<id>/retry`` or delete.
    """
    pending: list[PromiseRecord] = []
    if not os.path.isdir(PROMISES_DIR):
        return pending
    _maybe_prune_expired()
    for entry in os.listdir(PROMISES_DIR):
        if not entry:
            continue
        try:
            rec = _load_promise_from_disk(entry)
        except Exception as e:
            logger.warning("get_promise failed for folder %r: %s", entry, e, exc_info=True)
            continue
        if rec is None:
            continue
        if rec.status == 'pending':
            pending.append(rec)
    pending.sort(key=lambda rec: rec.created_at or 0)
    return pending


def _collect_error_promises() -> list[PromiseRecord]:
    """Collect promises that are in error state."""
    errors: list[PromiseRecord] = []
    if not os.path.isdir(PROMISES_DIR):
        return errors
    _maybe_prune_expired()
    for entry in os.listdir(PROMISES_DIR):
        if not entry:
            continue
        try:
            rec = _load_promise_from_disk(entry)
        except Exception as e:
            logger.warning("get_promise failed for folder %r: %s", entry, e, exc_info=True)
            continue
        if rec and rec.status == 'error':
            errors.append(rec)
    errors.sort(key=lambda rec: rec.created_at or 0)
    return errors


def _collect_ready_promises() -> list[PromiseRecord]:
    """Done promises, sorted by updated_at (oldest first)."""
    ready: list[PromiseRecord] = []
    if not os.path.isdir(PROMISES_DIR):
        return ready
    _maybe_prune_expired()
    for entry in os.listdir(PROMISES_DIR):
        if not entry:
            continue
        try:
            rec = _load_promise_from_disk(entry)
        except Exception as e:
            logger.warning("get_promise failed for folder %r: %s", entry, e, exc_info=True)
            continue
        if rec and rec.status == 'done':
            ready.append(rec)
    ready.sort(key=lambda rec: rec.updated_at or 0)
    return ready