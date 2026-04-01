"""
Promise Routes Module
Contains Flask route handlers for promise management and async request handling
"""
import os
import json
import logging
import datetime
import threading
import base64

from flask import Flask, request, Response

# Import app from parent module
from . import app
from .promises import (
    get_promise, get_promise_by_server_id, _promise_set_done, _promise_reset_pending,
    _collect_pending_promises, _collect_ready_promises, _load_request_snapshot,
    _prepare_execute_body, _sanitize_execute_headers, save_response, _json_bytes, _resolve_storage_path,
)
from .config import FORWARD_TIMEOUT
from .caching import get_cache

# Setup logger
logger = logging.getLogger(__name__)

# Import requests for executing promises
import requests


def _run_execute_in_background(promise_id: str, rec, request_snapshot: dict) -> None:
    """Execute promise against Ollama in background thread (non-blocking) with caching."""
    try:
        args = dict(request_snapshot.get('args') or {})
        args.pop('promise', None)
        headers = _sanitize_execute_headers(request_snapshot.get('headers') or {})
        body_payload = _prepare_execute_body(request_snapshot.get('body'))

        # Build cache key from target URL and body
        cache = get_cache()
        cache_payload = {
            "url": rec.target_url,
            "method": rec.method,
            "args": args,
            "body": request_snapshot.get('body'),
        }
        cache_key = cache.build_key("ollama", cache_payload)
        
        # Check cache first
        cached_response = cache.get(cache_key)
        if cached_response is not None:
            logger.info(f"Promise {promise_id} served from cache")
            body_base64 = cached_response.get('body_base64', '')
            body_bytes = base64.b64decode(body_base64) if body_base64 else b''
            _promise_set_done(
                promise_id,
                status_code=cached_response.get('status_code', 200),
                headers=cached_response.get('headers', {}),
                body=body_bytes
            )
            if rec.log_folder:
                try:
                    save_response(rec.log_folder, {
                        "status_code": cached_response.get('status_code', 200),
                        "headers": cached_response.get('headers', {}),
                        "content": cached_response.get('content', '')[:10000],
                        "cached": True,
                    })
                except Exception as e:
                    logger.debug(f"Failed to save cached response: {e}")
            return

        # Execute request to Ollama
        if rec.method == 'GET':
            resp = requests.get(rec.target_url, params=args, headers=headers, timeout=FORWARD_TIMEOUT)
        elif rec.method == 'POST':
            resp = requests.post(rec.target_url, params=args, headers=headers, data=body_payload, timeout=FORWARD_TIMEOUT)
        elif rec.method == 'PUT':
            resp = requests.put(rec.target_url, params=args, headers=headers, data=body_payload, timeout=FORWARD_TIMEOUT)
        elif rec.method == 'DELETE':
            resp = requests.delete(rec.target_url, params=args, headers=headers, data=body_payload, timeout=FORWARD_TIMEOUT)
        else:
            resp = requests.request(rec.method, rec.target_url, params=args, headers=headers, data=body_payload, timeout=FORWARD_TIMEOUT)

        # Cache successful responses
        if resp.status_code == 200:
            body_bytes = resp.content
            cached_value = {
                "status_code": resp.status_code,
                "headers": dict(resp.headers),
                "body_base64": base64.b64encode(body_bytes).decode('utf-8') if body_bytes else '',
                "content": resp.text[:10000] if hasattr(resp, 'text') else '',
            }
            cache.set(cache_key, cached_value)
            logger.info(f"Promise {promise_id} response cached")

        _promise_set_done(promise_id, status_code=resp.status_code, headers=dict(resp.headers), body=resp.content)
        if rec.log_folder:
            try:
                save_response(rec.log_folder, {
                    "status_code": resp.status_code,
                    "headers": dict(resp.headers),
                    "content": resp.text[:10000] if hasattr(resp, 'text') else '',
                })
            except Exception as e:
                logger.debug(f"Failed to save response: {e}")
        logger.info(f"Promise {promise_id} executed in background → {resp.status_code}")
    except requests.RequestException as exc:
        _promise_reset_pending(promise_id)
        if rec.log_folder:
            try:
                save_response(rec.log_folder, {"error": "execute_failed", "message": str(exc)})
            except Exception as e:
                logger.debug(f"Failed to save error: {e}")
        logger.error(f"Promise {promise_id} execute failed: {exc}")


# ========== Promise Endpoints ==========
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


# ========== UI Promise Endpoints ==========
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
        logger.warning(f"Failed to convert timestamp {rec.created_at} for promise {promise_id}: {type(e).__name__}: {e}")
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


# ========== Promise Viewer API Endpoints (for web interface) ==========

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

    # Получаем тело запроса: body.bin или request.json.body
    body_content = None
    body_path = os.path.join(_resolve_storage_path(rec.log_folder) or rec.log_folder or '', 'body.bin') if rec.log_folder else None
    if body_path and os.path.isfile(body_path):
        try:
            with open(body_path, 'rb') as f:
                body_content = f.read()
        except Exception as e:
            logger.debug(f"Failed to read body file: {e}")

    body_str = body_content.decode('utf-8', errors='replace') if body_content else None
    if body_str is None:
        body_str = request_snapshot.get('body')
        if isinstance(body_str, bytes):
            body_str = body_str.decode('utf-8', errors='replace')

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

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        payload = {}

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
    """Execute request to Ollama in background; return 202 immediately (non-blocking)."""
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

    # Check if Ollama is busy before executing
    from .ollama_manager import get_ollama_manager
    mgr = get_ollama_manager()
    ollama_status = mgr.get_status()
    
    if ollama_status.get('running') is not True:
        return Response(
            _json_bytes({"error": "ollama_not_running", "message": "Ollama is not running. Start Ollama first."}),
            status=503,
            mimetype='application/json',
        )
    
    # Check if Ollama is idle (not busy with previous request)
    idle_seconds = ollama_status.get('idle_seconds', 0)
    if idle_seconds < 5:  # Ollama was active in the last 5 seconds
        return Response(
            _json_bytes({
                "error": "ollama_busy", 
                "message": "Ollama is busy with another request. Please wait or cancel the current request.",
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
