"""
Promise API Routes Module
Contains Flask route handlers for promise API endpoints (non-UI)
"""
import os
import json
import logging
import threading

from flask import Flask, request, Response
from werkzeug.exceptions import BadRequest

# Import app from parent module
from . import app
from .promises import (
    get_promise, get_promise_by_server_id, _promise_set_done, _promise_reset_pending,
    _load_request_snapshot, _json_bytes, _resolve_storage_path,
)
from .promise_storage import _promise_folder
from .promise_execution import _run_execute_in_background

# Setup logger
logger = logging.getLogger(__name__)


@app.route('/promise/by-server-request/<server_promise_id>', methods=['GET'])
def promise_by_server_request(server_promise_id: str):
    """Lookup proxy promiseId by a2a-server's promiseId (for recovery after restart)."""
    rec = get_promise_by_server_id(server_promise_id)
    if rec is None:
        return Response(
            _json_bytes({"error": "promise_not_found", "serverPromiseId": server_promise_id}),
            status=404,
            mimetype='application/json',
        )
    return {
        "promiseId": rec.promise_id,
        "status": rec.status,
        "serverPromiseId": server_promise_id,
    }


@app.route('/promise/<promise_id>', methods=['GET'])
def promise_status(promise_id: str):
    """Статус promise по promiseId"""
    rec = get_promise(promise_id)
    if rec is None:
        return Response(
            _json_bytes({"error": "promise_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )

    if rec.status == 'pending':
        return Response(
            _json_bytes({"promiseId": promise_id, "status": "pending"}),
            status=202,
            mimetype='application/json',
        )

    if rec.status == 'error':
        return Response(
            _json_bytes({"promiseId": promise_id, "status": "error", "error": rec.error}),
            status=500,
            mimetype='application/json',
        )

    return {
        "promiseId": promise_id,
        "status": "done",
        "result_status_code": rec.result_status_code,
        "result_content_type": rec.result_content_type,
    }


@app.route('/promise/<promise_id>/response', methods=['GET'])
def promise_response(promise_id: str):
    """Получить итоговый ответ по promiseId (raw body)."""
    rec = get_promise(promise_id)
    if rec is None:
        return Response(
            _json_bytes({"error": "promise_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )

    if rec.status == 'pending':
        return Response(
            _json_bytes({"promiseId": promise_id, "status": "pending"}),
            status=202,
            mimetype='application/json',
        )

    if rec.status == 'error':
        return Response(
            _json_bytes({"promiseId": promise_id, "status": "error", "error": rec.error}),
            status=500,
            mimetype='application/json',
        )

    body_path = rec.result_body_path
    if not body_path or not os.path.isfile(body_path):
        return Response(
            _json_bytes({"promiseId": promise_id, "status": "error", "error": "missing_body"}),
            status=500,
            mimetype='application/json',
        )

    with open(body_path, 'rb') as f:
        body = f.read()

    resp = Response(body, status=rec.result_status_code or 200)
    resp.headers['Content-Type'] = rec.result_content_type or 'application/octet-stream'
    resp.headers['X-Promise-Id'] = promise_id
    resp.headers['X-Promise-Status'] = 'done'
    return resp


@app.route('/promise/<promise_id>/body_raw', methods=['GET'])
def promise_body_raw(promise_id: str):
    """Full provider JSON when `_promise_set_done` persisted `body_raw.json` (success path)."""
    rec = get_promise(promise_id)
    if rec is None:
        return Response(
            _json_bytes({"error": "promise_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )
    if rec.status == 'pending':
        return Response(
            _json_bytes({"promiseId": promise_id, "status": "pending"}),
            status=202,
            mimetype='application/json',
        )
    if rec.status == 'error':
        return Response(
            _json_bytes({"promiseId": promise_id, "status": "error", "error": rec.error}),
            status=500,
            mimetype='application/json',
        )
    raw_path = os.path.join(_promise_folder(promise_id), 'body_raw.json')
    if not os.path.isfile(raw_path):
        return Response(
            _json_bytes({"error": "body_raw_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )
    try:
        with open(raw_path, 'r', encoding='utf-8') as f:
            raw_obj = json.load(f)
    except (OSError, json.JSONDecodeError) as e:
        logger.warning("body_raw read failed %s: %s", raw_path, e, exc_info=True)
        return Response(
            _json_bytes({"error": "body_raw_unreadable", "promiseId": promise_id}),
            status=500,
            mimetype='application/json',
        )
    return Response(_json_bytes(raw_obj), status=200, mimetype='application/json')


@app.route('/promise/<promise_id>/request', methods=['GET'])
def promise_request(promise_id: str):
    """Получить тело запроса (method, path, headers, body)."""
    rec = get_promise(promise_id)
    if rec is None:
        return Response(
            _json_bytes({"error": "promise_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )

    # Загружаем request snapshot из log_folder
    request_snapshot = _load_request_snapshot(rec.log_folder)
    if not request_snapshot:
        return Response(
            _json_bytes({"error": "request_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )

    # Получаем тело запроса: body.md или request.json.body
    body_content = None
    body_path = os.path.join(_resolve_storage_path(rec.log_folder) or rec.log_folder or '', 'body.md') if rec.log_folder else None
    if body_path and os.path.isfile(body_path):
        try:
            with open(body_path, 'rb') as f:
                body_content = f.read()
        except Exception as e:
            logger.warning("Failed to read body file %s: %s", body_path, e, exc_info=True)

    body_str = body_content.decode('utf-8', errors='replace') if body_content else None
    if body_str is None:
        snap_body = request_snapshot.get('body')
        if isinstance(snap_body, (dict, list)):
            body_str = json.dumps(snap_body, ensure_ascii=False)
        elif isinstance(snap_body, bytes):
            body_str = snap_body.decode('utf-8', errors='replace')
        else:
            body_str = snap_body

    return {
        "promiseId": promise_id,
        "method": rec.method,
        "path": rec.path,
        "target_url": rec.target_url,
        "headers": request_snapshot.get('headers') or {},
        "args": request_snapshot.get('args') or {},
        "body": body_str,
        "body_base64": None,
    }


@app.route('/promise/<promise_id>/answer', methods=['POST'])
def promise_answer(promise_id: str):
    """Установить ответ на promise вручную."""
    rec = get_promise(promise_id)
    if rec is None:
        return Response(
            _json_bytes({"error": "promise_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )
    if rec.status != 'pending':
        return Response(
            _json_bytes({"error": "promise_not_pending", "promiseId": promise_id, "current_status": rec.status}),
            status=409,
            mimetype='application/json',
        )

    try:
        payload = request.get_json(force=True, silent=False)
    except BadRequest as e:
        return Response(
            _json_bytes(
                {
                    "error": "invalid_json",
                    "message": getattr(e, "description", None) or str(e),
                }
            ),
            status=400,
            mimetype="application/json",
        )
    if payload is None:
        payload = {}
    if not isinstance(payload, dict):
        return Response(
            _json_bytes({"error": "expected_json_object", "got": type(payload).__name__}),
            status=400,
            mimetype="application/json",
        )

    body_value = payload.get('body', '')
    status_code = int(payload.get('status_code', 200))
    content_type = str(payload.get('content_type', 'text/plain; charset=utf-8'))

    # Подготавливаем заголовки
    headers = payload.get('headers') if isinstance(payload.get('headers'), dict) else {}
    headers = {str(k): str(v) for k, v in headers.items()}
    headers['Content-Type'] = content_type

    # Подготавливаем тело
    if isinstance(body_value, (bytes, bytearray)):
        body_bytes = bytes(body_value)
    else:
        body_bytes = str(body_value).encode('utf-8')

    _promise_set_done(promise_id, status_code=status_code, headers=headers, body=body_bytes)

    return {
        "promiseId": promise_id,
        "status": "answer_set",
        "result_status_code": status_code,
    }


@app.route('/promise/<promise_id>/execute', methods=['POST'])
def promise_execute(promise_id: str):
    """Execute request to Local LLM upstream in background; return 202 immediately (non-blocking)."""
    rec = get_promise(promise_id)
    if rec is None:
        return Response(
            _json_bytes({"error": "promise_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )
    if rec.status != 'pending':
        return Response(
            _json_bytes({"error": "promise_not_pending", "promiseId": promise_id, "current_status": rec.status}),
            status=409,
            mimetype='application/json',
        )

    # Check if Local LLM upstream is busy before executing
    from .local_llm_manager import get_local_llm_manager
    mgr = get_local_llm_manager()
    upstream_llm_status = mgr.get_status()
    
    if upstream_llm_status.get('running') is not True:
        return Response(
            _json_bytes({"error": "local_llm_upstream_not_running", "message": "Local LLM upstream is not running. Start Local LLM upstream first."}),
            status=503,
            mimetype='application/json',
        )
    
    # Check if Local LLM upstream is idle (not busy with previous request)
    idle_seconds = upstream_llm_status.get('idle_seconds', 0)
    if idle_seconds < 5:  # Local LLM upstream was active in the last 5 seconds
        return Response(
            _json_bytes({
                "error": "local_llm_upstream_busy", 
                "message": "Local LLM upstream is busy with another request. Please wait or cancel the current request.",
                "idle_seconds": idle_seconds
            }),
            status=503,
            mimetype='application/json',
        )

    request_snapshot = _load_request_snapshot(rec.log_folder)
    if not request_snapshot:
        return Response(
            _json_bytes({"error": "request_snapshot_missing", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )

    thread = threading.Thread(
        target=_run_execute_in_background,
        args=(promise_id, rec, request_snapshot),
        daemon=True,
        name=f"execute-{promise_id[:8]}",
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


@app.route('/promise/<promise_id>/retry', methods=['POST'])
def promise_retry(promise_id: str):
    """Reset promise to pending for daemon to retry (clears error)."""
    rec = get_promise(promise_id)
    if rec is None:
        return Response(
            _json_bytes({"error": "promise_not_found", "promiseId": promise_id}),
            status=404,
            mimetype='application/json',
        )
    if rec.status == 'pending':
        return Response(
            _json_bytes({"promiseId": promise_id, "status": "pending", "message": "already_pending"}),
            status=200,
            mimetype='application/json',
        )
    ok = _promise_reset_pending(promise_id)
    if not ok:
        return Response(
            _json_bytes({"error": "reset_failed", "promiseId": promise_id}),
            status=500,
            mimetype='application/json',
        )
    return Response(
        _json_bytes({"promiseId": promise_id, "status": "pending", "message": "reset_for_retry"}),
        status=200,
        mimetype='application/json',
    )