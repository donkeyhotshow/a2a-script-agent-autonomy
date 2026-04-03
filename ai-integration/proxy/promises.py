"""
Promises Module
Handles async promise-based request processing
"""
import os
import json
import logging
import uuid
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, asdict
from typing import Any, Optional

from .config import PROMISES_DIR, PROMISE_TTL_SECONDS, PROMISE_MAX_WORKERS
from .network import check_port_occupied

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
    error: Optional[str] = None


_PROMISES_LOCK = __import__('threading').Lock()
_PROMISES: dict[str, PromiseRecord] = {}
_PROMISE_EXECUTOR = ThreadPoolExecutor(max_workers=PROMISE_MAX_WORKERS)


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
                updated_at = float(updated_at)
            except Exception:
                continue
            if updated_at < cutoff:
                try:
                    for fn in os.listdir(folder):
                        os.remove(os.path.join(folder, fn))
                    os.rmdir(folder)
                except Exception as e:
                    logger.debug(f"Failed to cleanup folder {folder}: {e}")
    except Exception as e:
        logger.debug(f"Failed to cleanup promises directory: {e}")


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
            error=meta.get('error'),
        )
        return rec
    except Exception:
        return None


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
    )
    os.makedirs(_promise_folder(promise_id), exist_ok=True)
    _save_promise(rec)
    with _PROMISES_LOCK:
        _PROMISES[promise_id] = rec
    return rec


def _promise_set_done(promise_id: str, *, status_code: int, headers: dict, body: bytes) -> None:
    rec = get_promise(promise_id)
    if rec is None:
        return
    os.makedirs(_promise_folder(promise_id), exist_ok=True)

    # Detect JSON LLM envelope once so we can both:
    # - keep the raw provider payload for debugging
    # - store only assistant content into body.md for the stack.
    content_type = headers.get('Content-Type') if isinstance(headers, dict) else None
    if not isinstance(content_type, str) or not content_type.strip():
        content_type = 'application/octet-stream'

    # Normalize LLM JSON responses (e.g., GLM/OpenAI-style) so that body.md
    # contains only the assistant content text instead of the full provider envelope.
    body_to_store = body or b''
    parsed_json_for_debug = None
    if body and content_type and 'json' in content_type.lower():
        parsed_json_for_debug = _safe_json_loads(body)
    body_to_store = _extract_llm_content_for_body_md(body_to_store, content_type)

    folder = _promise_folder(promise_id)
    body_path = _promise_body_path(promise_id)
    with open(body_path, 'wb') as f:
        f.write(body_to_store)

    # Save raw provider JSON separately if available, to avoid losing envelope.
    if isinstance(parsed_json_for_debug, dict):
        raw_json_path = os.path.join(folder, 'body_raw.json')
        _write_json_file(raw_json_path, parsed_json_for_debug)

    rec.status = 'done'
    rec.updated_at = time.time()
    rec.result_status_code = int(status_code)
    rec.result_headers = {str(k): str(v) for k, v in (headers or {}).items()}
    rec.result_content_type = content_type
    rec.result_body_path = body_path
    rec.error = None
    _save_promise(rec)


def _promise_set_error(promise_id: str, *, error: str) -> None:
    rec = get_promise(promise_id)
    if rec is None:
        return
    rec.status = 'error'
    rec.updated_at = time.time()
    rec.error = str(error)
    _save_promise(rec)


def _promise_reset_pending(promise_id: str) -> bool:
    """Reset error/done promise to pending for retry."""
    rec = get_promise(promise_id)
    if rec is None:
        return False
    rec.status = 'pending'
    rec.updated_at = time.time()
    rec.error = None
    rec.result_status_code = None
    rec.result_headers = None
    rec.result_content_type = None
    rec.result_body_path = None
    _save_promise(rec)
    return True


def _resolve_storage_path(relative_path: str) -> str:
    if not relative_path:
        return relative_path
    if os.path.isabs(relative_path):
        return relative_path
    return os.path.abspath(relative_path)


def _load_request_snapshot(log_folder: str) -> Optional[dict]:
    folder = _resolve_storage_path(log_folder)
    if not folder:
        return None

    # Try primary location
    if os.path.isdir(folder):
        request_path = os.path.join(folder, 'request.json')
        if os.path.isfile(request_path):
            try:
                with open(request_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return data if isinstance(data, dict) else None
            except Exception:
                return None

    # Fallback: check if it's old path, try new location
    if 'proxy_logs' in folder and 'request_' in folder:
        # Replace old path with new path in requests/
        parts = folder.split('proxy_logs')
        if len(parts) == 2:
            new_folder = parts[0] + 'proxy_logs' + os.sep + 'requests' + parts[1]
            if os.path.isdir(new_folder):
                request_path = os.path.join(new_folder, 'request.json')
                if os.path.isfile(request_path):
                    try:
                        with open(request_path, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        return data if isinstance(data, dict) else None
                    except Exception:
                        return None

    return None


def _collect_pending_promises() -> list[PromiseRecord]:
    """Collect only truly pending promises (not error ones)."""
    pending: list[PromiseRecord] = []
    if not os.path.isdir(PROMISES_DIR):
        return pending
    for entry in os.listdir(PROMISES_DIR):
        if not entry:
            continue
        try:
            rec = get_promise(entry)
        except Exception:
            continue
        if rec and rec.status == 'pending':
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
        except Exception:
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
        except Exception:
            continue
        if rec and rec.status == 'done':
            ready.append(rec)
    ready.sort(key=lambda rec: rec.updated_at or 0)
    return ready


def _prepare_execute_body(body_value: Any) -> Optional[bytes]:
    if body_value is None:
        return None
    if isinstance(body_value, (bytes, bytearray)):
        return bytes(body_value)

    text = str(body_value)
    try:
        parsed = json.loads(text)
    except Exception:
        return text.encode('utf-8')

    if isinstance(parsed, dict):
        parsed.pop('promise', None)
        return json.dumps(parsed, ensure_ascii=False).encode('utf-8')

    return text.encode('utf-8')


def _sanitize_execute_headers(headers: dict[str, Any]) -> dict[str, str]:
    sanitized: dict[str, str] = {}
    for key, value in (headers or {}).items():
        if not key:
            continue
        lower_key = key.lower()
        if lower_key in {'host', 'content-length'}:
            continue
        if lower_key == 'x-promise':
            continue
        sanitized[key] = str(value)
    return sanitized


# ============================================================================
# Helper Functions
# ============================================================================

def _safe_json_loads(data: bytes) -> Optional[dict]:
    if not data:
        return None
    try:
        parsed = json.loads(data)
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError):
        return None
    return parsed if isinstance(parsed, dict) else None


def _json_bytes(obj: Any) -> bytes:
    return json.dumps(obj, ensure_ascii=False).encode('utf-8')


def _write_json_file(path: str, obj: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def _read_json_file(path: str) -> Optional[dict]:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except FileNotFoundError:
        return None
    except Exception:
        return None


def save_request(folder_path, req_data):
    """Сохраняет запрос в файл"""
    request_file = os.path.join(folder_path, "request.json")
    with open(request_file, 'w', encoding='utf-8') as f:
        json.dump(req_data, f, ensure_ascii=False, indent=2)


def save_response(folder_path, resp_data):
    """Сохраняет ответ в файл"""
    response_file = os.path.join(folder_path, "response.json")
    with open(response_file, 'w', encoding='utf-8') as f:
        if isinstance(resp_data, dict):
            json.dump(resp_data, f, ensure_ascii=False, indent=2)
        else:
            f.write(str(resp_data))


def create_request_log(request_obj, body_data: bytes = None):
    """Создает лог запроса"""
    # If body_data is provided, use it; otherwise try to read from request
    if body_data is not None:
        body_text = body_data.decode('utf-8', errors='replace') if isinstance(body_data, bytes) else body_data
    else:
        body_text = request_obj.get_data(as_text=True) if request_obj.method in ['POST', 'PUT', 'PATCH'] else None
    
    return {
        "method": request_obj.method,
        "path": request_obj.path,
        "url": request_obj.url,
        "headers": dict(request_obj.headers),
        "args": dict(request_obj.args),
        "body": body_text
    }


def _extract_llm_content_for_body_md(body: bytes, content_type: Optional[str]) -> bytes:
    """
    For LLM provider JSON responses (e.g. GLM / OpenAI-style),
    extract the assistant message content and store only that
    in body.md so upper layers see the plain model answer.
    """
    if not body:
        return body

    if not content_type or 'json' not in content_type.lower():
        return body

    parsed = _safe_json_loads(body)
    if not isinstance(parsed, dict):
        return body

    content: Optional[str] = None
    choices = parsed.get('choices')
    if isinstance(choices, list) and choices:
        first = choices[0] or {}
        if isinstance(first, dict):
            message = first.get('message') or {}
            if isinstance(message, dict):
                maybe_content = message.get('content')
                if isinstance(maybe_content, str):
                    content = maybe_content

    if isinstance(content, str) and content.strip():
        return content.encode('utf-8')

    return body
