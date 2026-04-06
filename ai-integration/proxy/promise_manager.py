"""
Promise Manager Module
Handles promise creation, execution, and management for async requests
"""
import os
import time
import logging
from typing import Optional, Any, Dict, Union

logger = logging.getLogger(__name__)

from flask import Response

from .config import PROMISE_DELAY_BEFORE_EXECUTE
from .promises import (
    create_promise,
    _promise_set_done,
    _promise_reset_pending,
    _write_json_file,
    _json_bytes,
    create_request_log,
    save_request,
    save_response,
)
from .promise_storage import _promise_folder, _save_promise
from .promise_execution import try_resolve_promise_from_cache
from .api_key_routing import write_routing_hint
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
    want_trace: bool,
    trace_dir: str,
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

            if want_trace and trace_dir:
                from .promises import save_response
                save_response(trace_dir, {
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
            want_trace=want_trace,
            trace_dir=trace_dir if want_trace else "",
        )
    except Exception as e:
        logger.exception("create_promise_job failed promise_id=%s", promise.promise_id)
        _promise_reset_pending(promise.promise_id, delay_seconds=10.0)
        if want_trace and trace_dir:
            from .promises import save_response
            save_response(trace_dir, {"error": "promise_error", "message": str(e)})


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
    want_trace: bool,
    storage_dir: str,
) -> Union[Response, Dict[str, Any]]:
    """
    Handle promise mode execution. Traces (request/forwarded/response) live under
    ``proxy_logs/promises/<promiseId>/`` only — not ``proxy_logs/requests/``.

    Disk-cache hit: returns HTTP 200 with ``promiseId``, ``status: completed``,
    ``cached: true``, ``responseBody`` (full upstream JSON text) so the client can skip polling.
    """
    from .promises import _PROMISE_EXECUTOR

    simulate_snapshot = simulate_action if isinstance(simulate_action, dict) else None

    server_promise_id = (request.headers.get('X-Server-Promise-Id') or '').strip() or None
    promise = create_promise(
        method=request.method,
        path=path,
        target_url=target_url,
        log_folder='',
        simulate=simulate_snapshot,
        server_promise_id=server_promise_id,
    )

    trace_dir = ''
    if want_trace:
        trace_dir = _promise_folder(promise.promise_id)
        promise.log_folder = trace_dir
        _save_promise(promise)

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

    if want_trace and trace_dir:
        try:
            req_data = create_request_log(request, body_snapshot)
            save_request(trace_dir, req_data)
            if isinstance(body_json, dict):
                _write_json_file(os.path.join(trace_dir, 'forwarded_request.json'), body_json)
                hdr_safe = dict(headers_snapshot)
                auth = hdr_safe.get('Authorization') or hdr_safe.get('authorization')
                if auth:
                    hdr_safe['Authorization'] = 'Bearer ***' if str(auth).startswith('Bearer ') else '***'
                for k in list(hdr_safe.keys()):
                    if str(k).lower() == 'api-key':
                        hdr_safe[k] = '***'
                _write_json_file(os.path.join(trace_dir, 'forwarded_headers.json'), hdr_safe)
            if routed_provider_name and routed_provider_type:
                write_routing_hint(
                    trace_dir,
                    provider_name=routed_provider_name,
                    provider_type=routed_provider_type,
                    key_failover=routed_provider_type != 'ollama',
                )
        except Exception as e:
            logger.warning("Failed to save promise trace: %s", e, exc_info=True)

    if simulate_snapshot is None:
        cached = try_resolve_promise_from_cache(
            path=path,
            method=method_snapshot,
            target_url=target_url,
            body_for_prepare=body_snapshot,
            args=args_snapshot,
            headers=headers_snapshot,
            body_json=body_json_snapshot,
            routed_provider_name=routed_provider_snapshot,
            routed_provider_type=routed_type_snapshot,
            router_config=router_config_snapshot,
        )
        if cached is not None:
            sc, hdrs, body_b = cached
            _promise_set_done(
                promise.promise_id,
                status_code=sc,
                headers=hdrs,
                body=body_b,
            )
            if want_trace and trace_dir:
                try:
                    save_response(
                        trace_dir,
                        {
                            "status_code": sc,
                            "headers": hdrs,
                            "content": body_b.decode('utf-8', errors='replace')[:10000],
                            "cached": True,
                            "promised": True,
                        },
                    )
                    _write_json_file(
                        os.path.join(trace_dir, 'promise.json'),
                        {"promiseId": promise.promise_id, "status": "completed", "cached": True},
                    )
                except Exception as e:
                    logger.warning("Failed to save cached promise response trace: %s", e, exc_info=True)
            body_out = body_b.decode('utf-8', errors='replace')
            return Response(
                _json_bytes({
                    "promiseId": promise.promise_id,
                    "status": "completed",
                    "cached": True,
                    "responseBody": body_out,
                }),
                status=200,
                mimetype='application/json',
            )

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
            want_trace,
            trace_dir,
            storage_dir,
        )

    if want_trace and trace_dir:
        try:
            _write_json_file(
                os.path.join(trace_dir, 'promise.json'),
                {"promiseId": promise.promise_id, "status": "pending"},
            )
        except Exception as e:
            logger.warning("Failed to save promise.json: %s", e, exc_info=True)

    if PROMISE_DELAY_BEFORE_EXECUTE > 0:
        time.sleep(PROMISE_DELAY_BEFORE_EXECUTE)
    _PROMISE_EXECUTOR.submit(_job)

    return {"promiseId": promise.promise_id, "status": "pending"}