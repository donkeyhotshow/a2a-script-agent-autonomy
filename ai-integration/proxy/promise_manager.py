"""
Promise Manager Module
Handles promise creation, execution, and management for async requests
"""
import time
import logging
from typing import Optional, Any, Dict

logger = logging.getLogger(__name__)

from .config import PROMISE_DELAY_BEFORE_EXECUTE
from .promises import (
    create_promise,
    _promise_set_done,
    _promise_reset_pending,
    _write_json_file,
    _json_bytes,
)
from .ai_hub_config import _build_simulated_body


def create_promise_job(
    promise,
    method: str,
    target_url: str,
    body: Optional[bytes],
    args: Dict[str, Any],
    headers: Dict[str, Any],
    simulate_snapshot: Optional[Dict[str, Any]],
    model_snapshot: Optional[str],
    prompt_snapshot: str,
    path: str,
    body_json_snapshot: Optional[Dict[str, Any]],
    routed_provider_snapshot: Optional[str],
    routed_type_snapshot: Optional[str],
    router_config_snapshot,
    should_log: bool,
    folder_path: str,
    storage_dir: str,
) -> None:
    """
    Execute the promise job - either simulate or forward to upstream.
    """
    try:
        # Write debug payload
        debug_payload = {
            "method": method,
            "url": target_url,
            "headers": headers,
            "params": args,
            "body_json": body_json_snapshot,
        }
        debug_path = f"{storage_dir}/debug-request-latest.json"
        _write_json_file(debug_path, debug_payload)
    except Exception as e:
        logger.warning("Failed to write debug request payload: %s", e, exc_info=True)

    try:
        if simulate_snapshot is not None:
            # Handle simulated response
            delay_raw = simulate_snapshot.get('delay_ms')
            delay_ms = 0
            if delay_raw is not None:
                try:
                    delay_ms = int(delay_raw)
                except (ValueError, TypeError) as e:
                    logger.warning("simulate delay_ms invalid %r: %s", delay_raw, e)
                    delay_ms = 0
            if delay_ms > 0:
                time.sleep(delay_ms / 1000.0)

            status_code = int(simulate_snapshot.get('status_code') or 200)
            sim_headers = simulate_snapshot.get('headers') if isinstance(simulate_snapshot.get('headers'), dict) else {}

            sim_body, content_type = _build_simulated_body(
                simulate_snapshot,
                model=model_snapshot,
                prompt=prompt_snapshot,
                path=path,
                request_json=body_json_snapshot,
            )

            headers_out = dict(sim_headers)
            headers_out.setdefault('Content-Type', content_type)
            _promise_set_done(promise.promise_id, status_code=status_code, headers=headers_out, body=sim_body)

            if should_log and folder_path:
                from .promises import save_response
                save_response(folder_path, {
                    "status_code": status_code,
                    "headers": headers_out,
                    "content": (sim_body[:10000].decode('utf-8', errors='replace') if isinstance(sim_body, (bytes, bytearray)) else str(sim_body))[:10000],
                    "simulated": True,
                })
            return

        # Local import avoids circular init: proxy_handler → promise_manager while
        # promise_execution may still be loading during first package import chain.
        from .promise_execution import forward_promise_with_llm_disk_cache

        forward_promise_with_llm_disk_cache(
            promise_id=promise.promise_id,
            path=path,
            method=method,
            target_url=target_url,
            body_for_prepare=body,
            args=args,
            headers=headers,
            body_json=body_json_snapshot,
            routed_provider_name=routed_provider_snapshot,
            routed_provider_type=routed_type_snapshot,
            router_config=router_config_snapshot,
            should_log=should_log,
            folder_path=folder_path if should_log else "",
        )
    except Exception as e:
        logger.exception("create_promise_job failed promise_id=%s", promise.promise_id)
        _promise_reset_pending(promise.promise_id, delay_seconds=10.0)
        if should_log and folder_path:
            from .promises import save_response
            save_response(folder_path, {"error": "promise_error", "message": str(e)})


def handle_promise_mode(
    request,
    path: str,
    target_url: str,
    body: Optional[bytes],
    forward_args: Dict[str, Any],
    headers: Dict[str, Any],
    simulate_action: Optional[Dict[str, Any]],
    resolved_model: Optional[str],
    prompt: str,
    body_json: Optional[Dict[str, Any]],
    routed_provider_name: Optional[str],
    routed_provider_type: Optional[str],
    router_config,
    should_log: bool,
    folder_path: str,
    storage_dir: str,
):
    """
    Handle promise mode execution.
    """
    from .promises import _PROMISE_EXECUTOR, _write_json_file

    simulate_snapshot = simulate_action if isinstance(simulate_action, dict) else None

    server_promise_id = (request.headers.get('X-Server-Promise-Id') or '').strip() or None
    promise = create_promise(
        method=request.method,
        path=path,
        target_url=target_url,
        log_folder=folder_path if should_log else '',
        simulate=simulate_snapshot,
        server_promise_id=server_promise_id,
    )

    if should_log:
        try:
            _write_json_file(
                f"{folder_path}/promise.json",
                {"promiseId": promise.promise_id, "status": "pending"}
            )
        except Exception as e:
            logger.warning("Failed to save promise.json: %s", e, exc_info=True)

    # Prepare snapshots
    body_snapshot = body
    args_snapshot = dict(forward_args)
    headers_snapshot = dict(headers)
    method_snapshot = request.method
    prompt_snapshot = prompt
    model_snapshot = resolved_model
    body_json_snapshot = body_json if isinstance(body_json, dict) else None
    routed_provider_snapshot = routed_provider_name
    routed_type_snapshot = routed_provider_type
    router_config_snapshot = router_config

    def _job():
        create_promise_job(
            promise,
            method_snapshot,
            target_url,
            body_snapshot,
            args_snapshot,
            headers_snapshot,
            simulate_snapshot,
            model_snapshot,
            prompt_snapshot,
            path,
            body_json_snapshot,
            routed_provider_snapshot,
            routed_type_snapshot,
            router_config_snapshot,
            should_log,
            folder_path,
            storage_dir,
        )

    # TEMP: always run promise job inline so debug payload is written immediately.
    if PROMISE_DELAY_BEFORE_EXECUTE > 0:
        time.sleep(PROMISE_DELAY_BEFORE_EXECUTE)
    _PROMISE_EXECUTOR.submit(_job)

    return {"promiseId": promise.promise_id, "status": "pending"}