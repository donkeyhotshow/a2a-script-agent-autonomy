"""
Proxy Handler Module
Main proxy logic for forwarding requests to Ollama
Uses modular architecture with separate processors
"""
import os
import sys
import json
import logging
import uuid
import datetime
import time
from flask import Response
from typing import Optional, Any

# Setup logger
logger = logging.getLogger(__name__)

from .config import (
    OLLAMA_HOST,
    STORAGE_DIR,
    FORWARD_TIMEOUT,
    OLLAMA_AUTO_START,
    SIMULATION_ENABLED,
    SIMULATION_DATA_PATH,
    PROMISE_DELAY_BEFORE_EXECUTE,
    PROMISE_DAEMON_ONLY,
)
from .api_key_routing import forward_with_api_key_failover, write_routing_hint
from .ollama_manager import get_ollama_manager, check_port_occupied, get_ollama_host_port
from .ai_hub_config import (
    get_ai_hub_config, _is_truthy, _normalize_path, _normalize_model_key,
    _extract_prompt, _get_virtual_model, _virtual_show_response, _virtual_tags_entry,
    _match_when, _build_simulated_body
)
from .promises import (
    create_promise, _promise_set_done, _promise_reset_pending,
    save_request, save_response, create_request_log,
    _safe_json_loads, _json_bytes, _write_json_file, _PROMISE_EXECUTOR,
    is_llm_upstream_response_ok,
)

# Import new modules
from .request_processor import (
    _is_real_data_path, _check_promise_requested, _prepare_headers,
    _get_body, _get_forward_args
)
from .response_handler import create_error_response, create_simulated_response, forward_response
from .model_resolver import resolve_model_name

# Import refactored modules
from .rule_engine import process_model_and_rules
from .promise_manager import handle_promise_mode
from .upstream_client import forward_request, check_cache, save_to_cache
from .router_manager import get_router, resolve_routing, auto_start_ollama, _translate_ollama_to_openai_path
from .simulation_handler import handle_simulated_response, handle_virtual_show_response




import requests


def _fetch_tags_response(url: str, headers: dict[str, Any], params: Optional[dict[str, Any]]) -> tuple[Optional[requests.Response], Optional[dict]]:
    if not url:
        return None, None
    try:
        resp = requests.get(url, params=params or {}, headers=headers, timeout=FORWARD_TIMEOUT)
    except requests.exceptions.RequestException as exc:
        logger.warning("tags fetch failed %s: %s", url, exc, exc_info=True)
        return None, None
    if resp.status_code != 200:
        return resp, None
    try:
        tags = resp.json()
    except Exception as exc:
        logger.warning("tags response not JSON %s: %s", url, exc, exc_info=True)
        return resp, None
    return resp, tags if isinstance(tags, dict) else None


def _handle_api_tags_unified(
    cfg: dict,
    router,
    headers: dict[str, Any],
    forward_args: Optional[dict[str, Any]],
    should_log: bool,
    folder_path: str,
) -> Response:
    """
    Combined /api/tags: provider-config models (e.g. z_ai) + live Ollama + virtual_models.
    Each entry includes a string \"provider\" (e.g. z_ai, ollama, virtual).
    """
    models: list[dict[str, Any]] = []
    existing: set[str] = set()

    if router._initialized:
        for entry in router.tag_entries_from_non_ollama_providers():
            if not isinstance(entry, dict):
                continue
            k = _normalize_model_key(entry.get('name') or entry.get('model') or '')
            if k:
                existing.add(k)
            models.append(entry)

    ollama_models_injected = 0
    ollama_base = (OLLAMA_HOST.rstrip('/') or OLLAMA_HOST)
    if ollama_base:
        ollama_url = f"{ollama_base}/api/tags"
        _, ollama_tags = _fetch_tags_response(ollama_url, headers, forward_args or {})
        if isinstance(ollama_tags, dict):
            for entry in ollama_tags.get('models') or []:
                if not isinstance(entry, dict):
                    continue
                name_key = _normalize_model_key(entry.get('name') or entry.get('model') or '')
                if not name_key or name_key in existing:
                    continue
                row = dict(entry)
                row.setdefault('provider', 'ollama')
                existing.add(name_key)
                models.append(row)
                ollama_models_injected += 1

    virtual_models = cfg.get('virtual_models') or {}
    virtual_models_injected = 0
    if isinstance(virtual_models, dict):
        for vm in virtual_models.values():
            if not isinstance(vm, dict):
                continue
            entry = _virtual_tags_entry(vm)
            entry.setdefault('provider', 'virtual')
            entry_key = _normalize_model_key(str(entry.get('name', '')))
            if entry_key and entry_key in existing:
                continue
            models.append(entry)
            if entry_key:
                existing.add(entry_key)
            virtual_models_injected += 1

    tags_obj: dict[str, Any] = {'models': models}
    out = _json_bytes(tags_obj)
    response = Response(out, status=200, mimetype='application/json')
    if should_log:
        save_response(folder_path, {
            "status_code": 200,
            "headers": {"Content-Type": "application/json"},
            "content": out[:10000].decode('utf-8', errors='replace'),
            "simulated": True,
            "virtual_models_injected": virtual_models_injected,
            "ollama_models_injected": ollama_models_injected,
            "multi_provider_tags": True,
        })
    return response


def handle_proxy_request(path: str, request) -> Response:
    """Main proxy request handler - coordinates all processing modules"""
    
    should_log_base = _is_real_data_path(path)
    should_log = False
    folder_path = ''
    
    # Auto-start Ollama if enabled
    auto_start_ollama(path)
    
    try:
        # Base headers from incoming request (for content-type, etc.)
        base_headers = _prepare_headers(request)
        body, body_json = _get_body(request)
        promise_requested = _check_promise_requested(request, body_json)
        forward_args = _get_forward_args(request)
        
        should_log = should_log_base or promise_requested
        if should_log:
            request_id = str(uuid.uuid4())[:8]
            unix_timestamp = int(datetime.datetime.now().timestamp())
            folder_name = f"request_{unix_timestamp}_{request_id}"
            folder_path = os.path.join(STORAGE_DIR, "requests", folder_name)
            os.makedirs(folder_path, exist_ok=True)
            req_data = create_request_log(request, body)
            save_request(folder_path, req_data)
        
        cfg = get_ai_hub_config()
        path_norm = _normalize_path(path)
        
        model = None
        if isinstance(body_json, dict):
            model = body_json.get('model')
        
        router = get_router()
        target_url, headers, routed_provider_name, routed_provider_type = resolve_routing(
            path, model, cfg, router, base_headers, should_log, folder_path
        )
        
        # Handle virtual models - api/show
        if request.method == 'GET' and path_norm == 'api/show':
            model_q = request.args.get('model')
            if isinstance(model_q, str) and model_q.strip():
                response = handle_virtual_show_response(cfg, model_q, should_log, folder_path)
                if response:
                    return response
        
        # Combined multi-provider /api/tags (Z.AI config + live Ollama + virtual_models)
        if request.method == 'GET' and path_norm == 'api/tags':
            return _handle_api_tags_unified(cfg, router, headers, forward_args, should_log, folder_path)

        # Remove promise from body
        if isinstance(body_json, dict):
            body_json.pop('promise', None)

        # Process model and rules
        requested_model, resolved_model, prompt, simulate_action = process_model_and_rules(
            cfg, body_json, forward_args, request.method, path
        )

        # Handle unknown model error
        if requested_model and resolved_model is None:
            error_data = {
                "error": "unknown_model",
                "message": f"Unknown model alias: {requested_model}",
            }
            if should_log:
                save_response(folder_path, error_data)
            return Response(_json_bytes(error_data), status=400, mimetype='application/json')

        # Convert body to bytes and log
        if isinstance(body_json, dict):
            # Disable streaming
            body_json['stream'] = False
            body = _json_bytes(body_json)

            if should_log:
                try:
                    _write_json_file(os.path.join(folder_path, 'forwarded_request.json'), body_json)
                    hdr_safe = dict(headers)
                    auth = hdr_safe.get('Authorization') or hdr_safe.get('authorization')
                    if auth:
                        hdr_safe['Authorization'] = 'Bearer ***' if str(auth).startswith('Bearer ') else '***'
                    for k in list(hdr_safe.keys()):
                        if str(k).lower() == 'api-key':
                            hdr_safe[k] = '***'
                    _write_json_file(os.path.join(folder_path, 'forwarded_headers.json'), hdr_safe)
                except Exception as e:
                    logger.warning("Failed to save forwarded request: %s", e, exc_info=True)
        
        # Handle simulated response (non-promise)
        if simulate_action is not None and not promise_requested:
            return handle_simulated_response(
                simulate_action, resolved_model, prompt, path, body_json, should_log, folder_path
            )
        
        # Promise mode
        if promise_requested:
            promise_response = handle_promise_mode(
                request, path, target_url, body, forward_args, headers, simulate_action,
                resolved_model, prompt, body_json, routed_provider_name, routed_provider_type,
                router.config, should_log, folder_path, STORAGE_DIR
            )
            return Response(
                _json_bytes(promise_response),
                status=202,
                mimetype='application/json',
            )
        
        # Check cache first
        cached = check_cache(
            path, request.method, target_url, forward_args, body_json
        )
        if cached:
            return Response(cached['body'], status=cached['status'], content_type='application/json')

        # Forward request to upstream
        resp = forward_request(
            request.method, target_url, body, forward_args, headers,
            routed_provider_name, routed_provider_type, router.config
        )

        # Save to cache for successful responses
        save_to_cache(
            path, request.method, target_url, forward_args, body_json, resp
        )

        # Forward response
        return forward_response(resp, should_log, folder_path)
                
    except requests.exceptions.ConnectionError as e:
        error_data = {
            "error": "Ollama not available",
            "message": f"Could not connect to Ollama at {OLLAMA_HOST}",
            "details": str(e)
        }
        if should_log:
            save_response(folder_path, error_data)
        return Response(json.dumps(error_data), status=502, mimetype='application/json')
    except Exception as e:
        logger.exception("Proxy handler error path=%s", path)
        error_data = {
            "error": "Proxy error",
            "message": str(e)
        }
        if should_log:
            save_response(folder_path, error_data)
        return Response(json.dumps(error_data), status=500, mimetype='application/json')
