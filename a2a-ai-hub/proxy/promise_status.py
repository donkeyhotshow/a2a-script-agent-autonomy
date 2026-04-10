"""
Promise Status Module
Handles promise status management and state transitions
"""
import os
import time
import logging
from typing import Optional

from .promise_storage import PromiseRecord, _promise_folder, _promise_body_path, _save_promise
from .promise_retrieval import get_promise
from .promise_utils import _safe_json_loads, _write_json_file
from .llm_response_processor import _llm_upstream_failure_message
from .content_processor import _extract_llm_content_for_body_md
from .llm_response_formatter import format_llm_response

# Setup logger
logger = logging.getLogger(__name__)


def _failure_retry_at(status_code: int) -> float:
    """When to allow daemon retry after an upstream LLM failure (see _collect_pending_promises)."""
    now = time.time()
    if status_code >= 500:
        return now + 30.0
    if status_code == 429:
        return now + 120.0
    if status_code in (401, 403):
        return now + 365.0 * 86400 * 10  # auth/config: avoid tight retry loops
    return now + 60.0


def _promise_set_failed_llm(
    promise_id: str,
    *,
    status_code: int,
    headers: dict,
    body: bytes,
    user_message: str,
) -> None:
    """Mark promise as error: persist raw body for debugging; do not expose as successful completion."""
    rec = get_promise(promise_id)
    if rec is None:
        return
    os.makedirs(_promise_folder(promise_id), exist_ok=True)

    content_type = headers.get('Content-Type') if isinstance(headers, dict) else None
    if not isinstance(content_type, str) or not content_type.strip():
        content_type = 'application/octet-stream'

    folder = _promise_folder(promise_id)
    body_path = _promise_body_path(promise_id)
    with open(body_path, 'wb') as f:
        f.write(body or b'')

    if body and content_type and 'json' in content_type.lower():
        parsed = _safe_json_loads(body)
        if isinstance(parsed, dict):
            raw_json_path = os.path.join(folder, 'body_raw.json')
            _write_json_file(raw_json_path, parsed)

    rec.status = 'error'
    rec.updated_at = time.time()
    rec.error = user_message
    rec.result_status_code = int(status_code)
    rec.result_headers = {str(k): str(v) for k, v in (headers or {}).items()}
    rec.result_content_type = content_type
    rec.result_body_path = body_path
    rec.next_attempt_at = _failure_retry_at(int(status_code))
    _save_promise(rec)
    logger.warning(
        'Promise %s failed upstream LLM: %s (http=%s)',
        promise_id,
        user_message[:500],
        status_code,
    )


def _promise_set_done(promise_id: str, *, status_code: int, headers: dict, body: bytes) -> None:
    rec = get_promise(promise_id)
    if rec is None:
        return
    os.makedirs(_promise_folder(promise_id), exist_ok=True)

    content_type = headers.get('Content-Type') if isinstance(headers, dict) else None
    if not isinstance(content_type, str) or not content_type.strip():
        content_type = 'application/octet-stream'

    fail_msg = _llm_upstream_failure_message(int(status_code), body or b'', content_type)
    if fail_msg:
        _promise_set_failed_llm(
            promise_id,
            status_code=int(status_code),
            headers=dict(headers or {}),
            body=body or b'',
            user_message=fail_msg,
        )
        return

    # Detect JSON LLM envelope once so we can both:
    # - keep the raw provider payload for debugging
    # - store only assistant content into body.md for the stack.
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

    # Create formatted markdown version of the response
    if body_to_store:
        try:
            raw_text = body_to_store.decode('utf-8', errors='replace')
            if raw_text.strip():  # Only format non-empty responses
                formatted_response = format_llm_response(raw_text)
                if formatted_response:  # Only save if formatting produced content
                    formatted_body_path = os.path.join(folder, 'body_formatted.md')
                    with open(formatted_body_path, 'wb') as f:
                        f.write(formatted_response.encode('utf-8'))
                    rec.result_formatted_body_path = formatted_body_path
        except Exception as e:
            logger.warning(f"Failed to format LLM response for promise {promise_id}: {e}")
            # Continue without formatted version - raw response will be used as fallback

    rec.status = 'done'
    rec.updated_at = time.time()
    rec.result_status_code = int(status_code)
    rec.result_headers = {str(k): str(v) for k, v in (headers or {}).items()}
    rec.result_content_type = content_type
    rec.result_body_path = body_path
    rec.error = None
    rec.next_attempt_at = None
    _save_promise(rec)


def _promise_set_error(
    promise_id: str,
    *,
    error: str,
    delay_seconds: Optional[float] = 10.0,
) -> None:
    rec = get_promise(promise_id)
    if rec is None:
        return
    rec.status = 'error'
    rec.updated_at = time.time()
    rec.error = str(error)
    if delay_seconds is None:
        rec.next_attempt_at = None
    else:
        rec.next_attempt_at = time.time() + float(delay_seconds)
    _save_promise(rec)


def _promise_reset_pending(promise_id: str, delay_seconds: float = 0.0) -> bool:
    """Reset error/done promise to pending for retry.
    
    If delay_seconds > 0, sets status to 'error' and schedules retry after delay.
    If delay_seconds = 0, sets status to 'pending' for immediate retry.
    """
    rec = get_promise(promise_id)
    if rec is None:
        return False
    rec.updated_at = time.time()
    rec.error = None
    rec.result_status_code = None
    rec.result_headers = None
    rec.result_content_type = None
    rec.result_body_path = None
    
    if delay_seconds > 0:
        rec.status = 'error'
        rec.next_attempt_at = time.time() + delay_seconds
    else:
        rec.status = 'pending'
        rec.next_attempt_at = None
        
    _save_promise(rec)
    return True