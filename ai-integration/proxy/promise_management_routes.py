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
    _collect_pending_promises, _collect_ready_promises, _json_bytes,
)

# Setup logger
logger = logging.getLogger(__name__)


@app.route('/promises/status', methods=['GET'])
def promises_status():
    """Единый endpoint для опроса: только ready (ошибки не инвалидируют, демон ретраит)."""
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
        except Exception:
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
    """Получить список pending promises, отсортированных по created_at (старые first)."""
    pending = _collect_pending_promises()
    result = []
    for rec in pending:
        try:
            created_iso = datetime.datetime.fromtimestamp(rec.created_at, datetime.timezone.utc).isoformat()
        except Exception:
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