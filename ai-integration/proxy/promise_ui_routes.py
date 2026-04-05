"""
Promise UI Routes Module
Contains Flask route handlers for promise UI endpoints
"""
import os
import json
import logging
import datetime
import threading

from flask import Flask, request, Response

# Import app from parent module
from . import app
from .promises import (
    get_promise, _promise_set_done, _collect_pending_promises,
    _load_request_snapshot, _json_bytes, save_response,
)
from .promise_execution import _run_execute_in_background

# Setup logger
logger = logging.getLogger(__name__)


@app.route('/ui/promises/next', methods=['GET'])
def ui_promises_next():
    pending = _collect_pending_promises()
    if not pending:
        return {"pending": False}

    rec = pending[0]
    request_snapshot = _load_request_snapshot(rec.log_folder) or {}
    created_iso = None
    try:
        created_iso = datetime.datetime.fromtimestamp(rec.created_at, datetime.timezone.utc).isoformat()
    except Exception as e:
        logger.warning(f"Failed to convert timestamp {rec.created_at} for promise {rec.promise_id}: {type(e).__name__}: {e}")
        created_iso = None

    return {
        "pending": True,
        "promiseId": rec.promise_id,
        "status": rec.status,
        "created_at": created_iso,
        "method": rec.method,
        "path": rec.path,
        "target_url": rec.target_url,
        "log_folder": rec.log_folder,
        "request": request_snapshot,
        "result_status_code": rec.result_status_code,
        "result_content_type": rec.result_content_type,
        "error": rec.error,
    }


@app.route('/ui/promises/<promise_id>/execute', methods=['POST'])
def ui_promises_execute(promise_id: str):
    """Same as promise_execute: run in background, return 202 (non-blocking)."""
    rec = get_promise(promise_id)
    if rec is None:
        return Response(_json_bytes({"error": "promise_not_found", "promiseId": promise_id}), status=404,
                        mimetype='application/json')
    if rec.status != 'pending':
        return Response(_json_bytes({"error": "promise_not_pending", "promiseId": promise_id}), status=409,
                        mimetype='application/json')

    request_snapshot = _load_request_snapshot(rec.log_folder)
    if not request_snapshot:
        return Response(_json_bytes({"error": "request_snapshot_missing", "promiseId": promise_id}), status=404,
                        mimetype='application/json')

    thread = threading.Thread(
        target=_run_execute_in_background,
        args=(promise_id, rec, request_snapshot),
        daemon=True,
        name=f"ui-execute-{promise_id[:8]}",
    )
    thread.start()

    return Response(
        _json_bytes({
            "promiseId": promise_id,
            "status": "executing",
            "message": "Request sent to LLM, processing in background",
        }),
        status=202,
        mimetype='application/json',
    )


@app.route('/ui/promises/<promise_id>/respond', methods=['POST'])
def ui_promises_respond(promise_id: str):
    rec = get_promise(promise_id)
    if rec is None:
        return Response(_json_bytes({"error": "promise_not_found", "promiseId": promise_id}), status=404,
                        mimetype='application/json')
    if rec.status != 'pending':
        return Response(_json_bytes({"error": "promise_not_pending", "promiseId": promise_id}), status=409,
                        mimetype='application/json')

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        payload = {}

    body_value = payload.get('body', '')
    status_code = int(payload.get('status_code') or 200)
    headers = payload.get('headers') if isinstance(payload.get('headers'), dict) else {}
    content_type = str(payload.get('content_type') or headers.get('Content-Type') or 'text/plain; charset=utf-8')
    headers = {str(k): str(v) for k, v in headers.items()}
    headers['Content-Type'] = content_type

    if isinstance(body_value, (bytes, bytearray)):
        body_bytes = bytes(body_value)
    else:
        body_bytes = str(body_value).encode('utf-8')

    _promise_set_done(promise_id, status_code=status_code, headers=headers, body=body_bytes)
    if rec.log_folder:
        try:
            save_response(rec.log_folder, {
                "status_code": status_code,
                "headers": headers,
                "content": (body_bytes[:10000].decode('utf-8', errors='replace') if body_bytes else ''),
                "manual_response": True,
            })
        except Exception as e:
            logger.debug(f"Failed to save manual response: {e}")

    return {
        "promiseId": promise_id,
        "status": "manual_response_recorded",
        "result_status_code": status_code,
    }


@app.route('/ui/promises/view', methods=['GET'])
def ui_promises_view():
    from .views import PROMISE_VIEW_HTML
    return Response(PROMISE_VIEW_HTML, mimetype='text/html')