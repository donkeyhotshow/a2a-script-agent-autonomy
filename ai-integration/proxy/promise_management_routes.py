"""
Promise Management Routes Module
Contains Flask route handlers for promise management and viewer API endpoints
"""
import datetime
import logging

from flask import Flask, request, Response

# Import app from parent module
from . import app
from .promises import (
    _collect_pending_promises,
    _collect_ready_promises,
    _collect_error_promises,
    _json_bytes,
)

# Setup logger
logger = logging.getLogger(__name__)


@app.route('/promises/status', methods=['GET'])
def promises_status():
    """Unified poll: completed rows only (see ``GET /promises/errors`` for failures)."""
    ready = _collect_ready_promises()
    ready_list = []
    for rec in ready:
        try:
            updated_iso = datetime.datetime.fromtimestamp(rec.updated_at, datetime.timezone.utc).isoformat()
        except Exception as e:
            logger.warning(f"Failed to convert updated_at timestamp {rec.updated_at} for promise {rec.promise_id}: {type(e).__name__}: {e}")
            updated_iso = None
        ready_list.append({
            "promiseId": rec.promise_id,
            "status": rec.status,
            "serverPromiseId": rec.server_promise_id,
            "updated_at": updated_iso,
            "updated_at_unix": rec.updated_at,
        })
    return Response(_json_bytes({"ready": ready_list}), mimetype='application/json')


@app.route('/promises/ready', methods=['GET'])
def promises_ready():
    """Список готовых (done) promises, отсортированных по updated_at (старые first)."""
    ready = _collect_ready_promises()
    result = []
    for rec in ready:
        try:
            updated_iso = datetime.datetime.fromtimestamp(rec.updated_at, datetime.timezone.utc).isoformat()
        except Exception as e:
            logger.warning(
                "Failed to convert updated_at %r for promise %s: %s",
                rec.updated_at,
                rec.promise_id,
                e,
            )
            updated_iso = None
        result.append({
            "promiseId": rec.promise_id,
            "status": rec.status,
            "serverPromiseId": rec.server_promise_id,
            "updated_at": updated_iso,
            "updated_at_unix": rec.updated_at,
        })
    return Response(_json_bytes(result), mimetype='application/json')


@app.route('/promises/pending', methods=['GET'])
def promises_pending():
    """Список только ``pending`` (ошибки не подхватываются автоматически — см. ``POST /promise/<id>/retry``)."""
    pending = _collect_pending_promises()
    result = []
    for rec in pending:
        try:
            created_iso = datetime.datetime.fromtimestamp(rec.created_at, datetime.timezone.utc).isoformat()
        except Exception as e:
            logger.warning(
                "Failed to convert created_at %r for promise %s: %s",
                rec.created_at,
                rec.promise_id,
                e,
            )
            created_iso = None
        result.append({
            "promiseId": rec.promise_id,
            "status": rec.status,
            "created_at": created_iso,
            "created_at_unix": rec.created_at,
            "method": rec.method,
            "path": rec.path,
            "target_url": rec.target_url,
            "log_folder": rec.log_folder,
        })
    return Response(_json_bytes(result), mimetype='application/json')


_ERROR_LIST_SHORT = 400


def _short_err_for_list(err, detail_full: bool):
    if err is None:
        return None, False
    s = str(err).strip()
    if detail_full or len(s) <= _ERROR_LIST_SHORT:
        return s, False
    return s[:_ERROR_LIST_SHORT] + '...', True


@app.route('/promises/errors', methods=['GET'])
def promises_errors():
    """List hub tickets in ``error`` (not auto-retried). ``?detail=1`` — full ``error`` text per row."""
    errors = _collect_error_promises()
    detail_full = (request.args.get('detail') or '').strip().lower() in ('1', 'true', 'yes', 'full')
    result = []
    for rec in errors:
        try:
            updated_iso = datetime.datetime.fromtimestamp(rec.updated_at, datetime.timezone.utc).isoformat()
        except Exception as e:
            logger.warning(
                'Failed to convert updated_at %r for promise %s: %s',
                rec.updated_at,
                rec.promise_id,
                e,
            )
            updated_iso = None
        short, truncated = _short_err_for_list(rec.error, detail_full)
        row = {
            'promiseId': rec.promise_id,
            'status': 'error',
            'error': short,
            'method': rec.method,
            'path': rec.path,
            'target_url': rec.target_url,
            'updated_at': updated_iso,
            'updated_at_unix': rec.updated_at,
        }
        if truncated:
            row['error_truncated'] = True
        result.append(row)
    return Response(_json_bytes(result), mimetype='application/json')