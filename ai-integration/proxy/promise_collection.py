"""
Promise Collection Module
Handles collection of promises by status and criteria
"""
import logging
import os
import time
from typing import List

logger = logging.getLogger(__name__)

from .promise_storage import PromiseRecord
from .promise_retrieval import get_promise
from .config import PROMISES_DIR


def _collect_pending_promises() -> list[PromiseRecord]:
    """Collect promises that are ready to be processed: pending or error with past next_attempt_at."""
    pending: list[PromiseRecord] = []
    if not os.path.isdir(PROMISES_DIR):
        return pending
    now = time.time()
    for entry in os.listdir(PROMISES_DIR):
        if not entry:
            continue
        try:
            rec = get_promise(entry)
        except Exception as e:
            logger.warning("get_promise failed for folder %r: %s", entry, e, exc_info=True)
            continue
        if rec is None:
            continue
        # Include if status is pending
        if rec.status == 'pending':
            pending.append(rec)
        # Include if status is error and next_attempt_at is in the past (or None/0)
        elif rec.status == 'error':
            next_attempt = rec.next_attempt_at or 0
            if next_attempt <= now:
                pending.append(rec)
    pending.sort(key=lambda rec: rec.created_at or 0)
    return pending


def _collect_error_promises() -> list[PromiseRecord]:
    """Collect promises that are in error state."""
    errors: list[PromiseRecord] = []
    if not os.path.isdir(PROMISES_DIR):
        return errors
    for entry in os.listdir(PROMISES_DIR):
        if not entry:
            continue
        try:
            rec = get_promise(entry)
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
    for entry in os.listdir(PROMISES_DIR):
        if not entry:
            continue
        try:
            rec = get_promise(entry)
        except Exception as e:
            logger.warning("get_promise failed for folder %r: %s", entry, e, exc_info=True)
            continue
        if rec and rec.status == 'done':
            ready.append(rec)
    ready.sort(key=lambda rec: rec.updated_at or 0)
    return ready