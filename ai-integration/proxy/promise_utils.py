"""
Promise Utils Module
Basic utility functions for promise processing
"""
import os
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

from .config import PROMISES_DIR


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
            except (json.JSONDecodeError, OSError, UnicodeDecodeError) as e:
                logger.warning("request.json unreadable %s: %s", request_path, e, exc_info=True)
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
                    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as e:
                        logger.warning("request.json unreadable %s: %s", request_path, e, exc_info=True)
                        return None

    return None


def _safe_json_loads(data: bytes) -> Optional[dict]:
    if not data:
        return None
    try:
        parsed = json.loads(data)
    except json.JSONDecodeError as e:
        sample = data[:200].decode("utf-8", errors="replace").lstrip()
        if sample.startswith(("{", "[")):
            logger.warning("_safe_json_loads: malformed JSON object/array: %s", e)
        return None
    except UnicodeDecodeError as e:
        logger.warning("_safe_json_loads: utf-8 decode failed: %s", e)
        return None
    except TypeError as e:
        logger.warning("_safe_json_loads: unexpected type: %s", e)
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
    except (json.JSONDecodeError, OSError, UnicodeDecodeError) as e:
        logger.warning("JSON read failed %s: %s", path, e, exc_info=True)
        return None


def _prepare_execute_body(body_value: Any) -> Optional[bytes]:
    if body_value is None:
        return None
    if isinstance(body_value, (bytes, bytearray)):
        return bytes(body_value)

    text = str(body_value)
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as e:
        s = text.lstrip()
        if s.startswith(("{", "[")):
            logger.warning("_prepare_execute_body: invalid JSON in string body: %s", e)
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
        body_text = request_obj.get_data(as_text=True) if request_obj.method in ['POST', 'PUT', 'PATCH'] else ""

    return {
        "method": request_obj.method,
        "path": request_obj.path,
        "url": request_obj.url,
        "headers": dict(request_obj.headers),
        "args": dict(request_obj.args),
        "body": body_text
    }