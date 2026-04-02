"""
Proxy Handler Module
Main proxy logic for forwarding requests to Ollama
Uses modular architecture with separate processors
"""
import os
import json
import logging
import uuid
import datetime
import time
from urllib.parse import urlparse
from flask import Response
from typing import Optional, Any

# Setup logger
logger = logging.getLogger(__name__)

from .config import (
    OLLAMA_HOST, STORAGE_DIR, FORWARD_TIMEOUT, OLLAMA_AUTO_START,
    SIMULATION_ENABLED, SIMULATION_DATA_PATH, PROMISE_DELAY_BEFORE_EXECUTE,
    PROMISE_DAEMON_ONLY,
)
from .ollama_manager import get_ollama_manager, check_port_occupied, get_ollama_host_port
from .ai_hub_config import (
    get_ai_hub_config, _is_truthy, _normalize_path, _normalize_model_key,
    _extract_prompt, _get_virtual_model, _virtual_show_response, _virtual_tags_entry,
    _match_when, _build_simulated_body
)
from .promises import (
    create_promise, _promise_set_done, _promise_reset_pending,
    save_request, save_response, create_request_log,
    _safe_json_loads, _json_bytes, _write_json_file, _PROMISE_EXECUTOR
)

# Import new modules
from .request_processor import (
    _is_real_data_path, _check_promise_requested, _prepare_headers,
    _get_body, _get_forward_args
)
from .response_handler import create_error_response, create_simulated_response, forward_response
from .model_resolver import resolve_model_name
from .caching import get_cache

import requests


def _normalize_host_key(url: str) -> str:
    if not url:
        return ''
    parsed = urlparse(url)
    host = (parsed.hostname or '').lower()
    if not host:
        return ''
    port = parsed.port
    if port is None:
        port = 443 if parsed.scheme == 'https' else 80
    return f"{host}:{port}"


def _hosts_equal(a: str, b: str) -> bool:
    return bool(a and b and _normalize_host_key(a) == _normalize_host_key(b))


def _fetch_tags_response(url: str, headers: dict[str, Any], params: Optional[dict[str, Any]]) -> tuple[Optional[requests.Response], Optional[dict]]:
    if not url:
        return None, None
    try:
        resp = requests.get(url, params=params or {}, headers=headers, timeout=FORWARD_TIMEOUT)
    except requests.exceptions.RequestException:
        return None, None
    if resp.status_code != 200:
        return resp, None
    try:
        tags = resp.json()
    except Exception:
        return resp, None
    return resp, tags if isinstance(tags, dict) else None


def handle_proxy_request(path: str, request) -> Response:
    """Main proxy request handler - coordinates all processing modules"""
    
    should_log_base = _is_real_data_path(path)
    should_log = False
    folder_path = ''
    
    # Auto-start Ollama if enabled
    if OLLAMA_AUTO_START and path.startswith('api/'):
        mgr = get_ollama_manager()
        if not mgr.is_running():
            mgr.start()
    
    try:
        headers = _prepare_headers(request)
        body, body_json = _get_body(request)
        promise_requested = _check_promise_requested(request, body_json)
        forward_args = _get_forward_args(request)
        
        should_log = should_log_base or promise_requested
        if should_log:
            request_id = str(uuid.uuid4())[:8]
            unix_timestamp = int(datetime.datetime.now().timestamp())
            folder_name = f"request_{unix_timestamp}_{request_id}"
            folder_path = os.path.join(STORAGE_DIR, folder_name)
            os.makedirs(folder_path, exist_ok=True)
            req_data = create_request_log(request, body)
            save_request(folder_path, req_data)
        
        cfg = get_ai_hub_config()
        path_norm = _normalize_path(path)
        
        model = None
        if isinstance(body_json, dict):
            model = body_json.get('model')
        
        from .providers.router import get_router
        router = get_router()
        
        if not router._initialized:
            try:
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    loop.run_until_complete(router.initialize())
                finally:
                    loop.close()
            except Exception as e:
                logger.warning(f"Failed to initialize router: {e}, falling back to Ollama")
        
        if model and router._initialized:
            model = router._resolve_model(model)
            provider_chain = router._get_provider_chain(model)
            if provider_chain:
                provider_name, provider = provider_chain[0]
                target_url = provider.config.url.rstrip('/') + '/' + path
                logger.info(f"Routed request for model '{model}' to provider '{provider_name}' -> {target_url}")
            else:
                fallback_host = OLLAMA_HOST.rstrip('/') or OLLAMA_HOST
                target_url = f"{fallback_host}/{path}"
                logger.warning(f"No provider available for model '{model}', falling back to Ollama")
        else:
            fallback_host = OLLAMA_HOST.rstrip('/') or OLLAMA_HOST
            target_url = f"{fallback_host}/{path}"
        
        # Handle virtual models - api/show
        if request.method == 'GET' and path_norm == 'api/show':
            model_q = request.args.get('model')
            if isinstance(model_q, str) and model_q.strip():
                vm = _get_virtual_model(cfg, model_q.strip())
                if vm is not None:
                    body_obj = _virtual_show_response(vm)
                    body_bytes = _json_bytes(body_obj)
                    response = Response(body_bytes, status=200, mimetype='application/json')
                    if should_log:
                        save_response(folder_path, {
                            "status_code": 200,
                            "headers": {"Content-Type": "application/json"},
                            "content": body_bytes[:10000].decode('utf-8', errors='replace'),
                            "simulated": True,
                            "virtual_model": vm.get('name') or vm.get('key'),
                        })
                    return response
        
        # Handle virtual models - api/tags
        if request.method == 'GET' and path_norm == 'api/tags':
            virtual_models = cfg.get('virtual_models') or {}
            resp, tags_obj = _fetch_tags_response(target_url, headers, forward_args or {})
            if resp and resp.status_code == 200 and tags_obj is None:
                return Response(resp.content, status=200, mimetype='application/json')
            if tags_obj is None:
                tags_obj = {"models": []}

            models: list[dict[str, Any]] = []
            existing: set[str] = set()
            raw_models = tags_obj.get('models')
            if isinstance(raw_models, list):
                for entry in raw_models:
                    if not isinstance(entry, dict):
                        continue
                    models.append(entry)
                    name_key = _normalize_model_key(entry.get('name') or entry.get('model') or '')
                    if name_key:
                        existing.add(name_key)

            ollama_models_injected = 0
            if OLLAMA_HOST and not _hosts_equal(target_url, OLLAMA_HOST):
                ollama_base = (OLLAMA_HOST.rstrip('/') or OLLAMA_HOST)
                ollama_url = f"{ollama_base}/api/tags"
                _, ollama_tags = _fetch_tags_response(ollama_url, headers, forward_args or {})
                if isinstance(ollama_tags, dict):
                    for entry in ollama_tags.get('models') or []:
                        if not isinstance(entry, dict):
                            continue
                        name_key = _normalize_model_key(entry.get('name') or entry.get('model') or '')
                        if not name_key or name_key in existing:
                            continue
                        existing.add(name_key)
                        models.append(entry)
                        ollama_models_injected += 1

            virtual_models_injected = 0
            if isinstance(virtual_models, dict):
                for vm in virtual_models.values():
                    if not isinstance(vm, dict):
                        continue
                    entry = _virtual_tags_entry(vm)
                    entry_key = _normalize_model_key(str(entry.get('name', '')))
                    if entry_key and entry_key in existing:
                        continue
                    models.append(entry)
                    if entry_key:
                        existing.add(entry_key)
                    virtual_models_injected += 1

            tags_obj['models'] = models
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
                })
            return response
        
        # Process model and rules
        requested_model: Optional[str] = None
        resolved_model: Optional[str] = None
        prompt = ''
        simulate_action: Optional[dict] = None
        
        # Debug logging
        debug_file = STORAGE_DIR + '/debug.log'
        
        # Remove promise from body
        if isinstance(body_json, dict):
            body_json.pop('promise', None)
            
            # Get requested model
            requested_model = body_json.get('model') if isinstance(body_json.get('model'), str) else None
            resolved_model, _ = resolve_model_name(requested_model, cfg)
            
            if requested_model and resolved_model is None:
                error_data = {
                    "error": "unknown_model",
                    "message": f"Unknown model alias: {requested_model}",
                }
                if should_log:
                    save_response(folder_path, error_data)
                return Response(_json_bytes(error_data), status=400, mimetype='application/json')
            
            if resolved_model:
                body_json['model'] = resolved_model
            
            # Disable streaming
            body_json['stream'] = False
            
            prompt = _extract_prompt(body_json)
            
            # Force qwen3:8b (for debugging)
            body_json['model'] = 'qwen3:8b'
            resolved_model = 'qwen3:8b'
            
            # Apply routing rules
            for rule in cfg.get('rules') or []:
                when = rule.get('when') or {}
                if not isinstance(when, dict):
                    continue
                if not _match_when(
                    when,
                    method=request.method,
                    path=path,
                    requested_model=requested_model,
                    resolved_model=resolved_model,
                    prompt=prompt,
                    compiled_rule=rule,
                ):
                    continue
                
                then = rule.get('then')
                actions = then if isinstance(then, list) else [then]
                for action in actions:
                    if not isinstance(action, dict):
                        continue
                    action_type = str(action.get('type') or '').strip()
                    
                    if action_type in {'set_model', 'reroute_model', 'reroute'}:
                        new_model = action.get('model')
                        if isinstance(new_model, str) and new_model.strip():
                            mapped, _ = resolve_model_name(new_model, cfg)
                            body_json['model'] = mapped or new_model.strip()
                            resolved_model = body_json['model']
                    elif action_type in {'simulate'}:
                        simulate_action = action
                        break
                
                if simulate_action is not None:
                    break
            
            # Convert body to bytes
            body = _json_bytes(body_json)
            
            if should_log:
                try:
                    _write_json_file(os.path.join(folder_path, 'forwarded_request.json'), body_json)
                except Exception as e:
                    logger.debug(f"Failed to save forwarded request: {e}")
        else:
            # GET requests or non-JSON body
            model_arg = forward_args.get('model')
            if isinstance(model_arg, str) and model_arg.strip():
                requested_model = model_arg
                resolved_model, _ = resolve_model_name(model_arg, cfg)
                if requested_model and resolved_model is None:
                    error_data = {
                        "error": "unknown_model",
                        "message": f"Unknown model alias: {requested_model}",
                    }
                    if should_log:
                        save_response(folder_path, error_data)
                    return Response(_json_bytes(error_data), status=400, mimetype='application/json')
                if resolved_model:
                    forward_args['model'] = resolved_model
            
            # Apply rules for non-JSON
            for rule in cfg.get('rules') or []:
                when = rule.get('when') or {}
                if not isinstance(when, dict):
                    continue
                if not _match_when(
                    when,
                    method=request.method,
                    path=path,
                    requested_model=requested_model,
                    resolved_model=resolved_model,
                    prompt='',
                    compiled_rule=rule,
                ):
                    continue
                
                then = rule.get('then')
                actions = then if isinstance(then, list) else [then]
                for action in actions:
                    if not isinstance(action, dict):
                        continue
                    action_type = str(action.get('type') or '').strip()
                    if action_type in {'set_model', 'reroute_model', 'reroute'}:
                        new_model = action.get('model')
                        if isinstance(new_model, str) and new_model.strip():
                            mapped, _ = resolve_model_name(new_model, cfg)
                            forward_args['model'] = mapped or new_model.strip()
                            resolved_model = forward_args['model']
                    elif action_type in {'simulate'}:
                        simulate_action = action
                        break
                
                if simulate_action is not None:
                    break
        
        # Handle simulated response (non-promise)
        if simulate_action is not None and not promise_requested:
            delay_ms = simulate_action.get('delay_ms')
            try:
                delay_ms = int(delay_ms) if delay_ms is not None else 0
            except Exception:
                delay_ms = 0
            if delay_ms > 0:
                time.sleep(delay_ms / 1000.0)
            
            status_code = int(simulate_action.get('status_code') or 200)
            sim_headers = simulate_action.get('headers') if isinstance(simulate_action.get('headers'), dict) else {}
            sim_body, content_type = _build_simulated_body(
                simulate_action,
                model=resolved_model,
                prompt=prompt,
                path=path,
                request_json=body_json if isinstance(body_json, dict) else None,
            )
            response = Response(sim_body, status=status_code)
            response.headers['Content-Type'] = sim_headers.get('Content-Type', content_type)
            for k, v in sim_headers.items():
                if str(k).lower() == 'content-type':
                    continue
                response.headers[str(k)] = str(v)
            
            if should_log:
                save_response(folder_path, {
                    "status_code": status_code,
                    "headers": dict(response.headers),
                    "content": (sim_body[:10000].decode('utf-8', errors='replace') if isinstance(sim_body, (bytes, bytearray)) else str(sim_body))[:10000],
                    "simulated": True,
                })
            return response
        
        # Promise mode
        if promise_requested:
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
                        os.path.join(folder_path, 'promise.json'), 
                        {"promiseId": promise.promise_id, "status": "pending"}
                    )
                except Exception as e:
                    logger.debug(f"Failed to save promise.json: {e}")
            
            body_snapshot = body
            args_snapshot = dict(forward_args)
            headers_snapshot = dict(headers)
            method_snapshot = request.method
            prompt_snapshot = prompt
            model_snapshot = resolved_model
            body_json_snapshot = body_json if isinstance(body_json, dict) else None
            
            def _job():
                try:
                    if simulate_snapshot is not None:
                        delay_ms = simulate_snapshot.get('delay_ms')
                        try:
                            delay_ms = int(delay_ms) if delay_ms is not None else 0
                        except Exception:
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
                            save_response(folder_path, {
                                "status_code": status_code,
                                "headers": headers_out,
                                "content": (sim_body[:10000].decode('utf-8', errors='replace') if isinstance(sim_body, (bytes, bytearray)) else str(sim_body))[:10000],
                                "simulated": True,
                            })
                        return
                    
                    # Forward to Ollama
                    if method_snapshot == 'GET':
                        resp0 = requests.get(target_url, params=args_snapshot, headers=headers_snapshot, timeout=FORWARD_TIMEOUT)
                    elif method_snapshot == 'POST':
                        resp0 = requests.post(target_url, data=body_snapshot, headers=headers_snapshot, timeout=FORWARD_TIMEOUT, stream=False)
                    elif method_snapshot == 'PUT':
                        resp0 = requests.put(target_url, data=body_snapshot, headers=headers_snapshot, timeout=FORWARD_TIMEOUT)
                    elif method_snapshot == 'DELETE':
                        resp0 = requests.delete(target_url, headers=headers_snapshot, timeout=FORWARD_TIMEOUT)
                    else:
                        resp0 = requests.request(method_snapshot, target_url, data=body_snapshot, headers=headers_snapshot, timeout=FORWARD_TIMEOUT)
                    
                    _promise_set_done(promise.promise_id, status_code=resp0.status_code, headers=dict(resp0.headers), body=resp0.content)
                    
                    if should_log and folder_path:
                        save_response(folder_path, {
                            "status_code": resp0.status_code,
                            "headers": dict(resp0.headers),
                            "content": resp0.text[:10000] if len(resp0.text) > 10000 else resp0.text,
                            "promised": True,
                        })
                except Exception as e:
                    _promise_reset_pending(promise.promise_id)
                    if should_log and folder_path:
                        save_response(folder_path, {"error": "promise_error", "message": str(e)})
            
            # When daemon_only: only daemon executes real requests; simulate runs inline (fast)
            run_inline = (not PROMISE_DAEMON_ONLY) or (simulate_snapshot is not None)
            if run_inline:
                if PROMISE_DELAY_BEFORE_EXECUTE > 0:
                    time.sleep(PROMISE_DELAY_BEFORE_EXECUTE)
                _PROMISE_EXECUTOR.submit(_job)
            
            return Response(
                _json_bytes({"promiseId": promise.promise_id, "status": "pending"}),
                status=202,
                mimetype='application/json',
            )
        
        # Cache check before request to Ollama
        cache = get_cache()
        cache_key = cache.build_key("ollama", {"path": path, "body": body_json})
        
        # Check cache first
        cached = cache.get(cache_key)
        if cached:
            logger.debug(f"Cache hit for key: {cache_key[:16]}...")
            return Response(cached['body'], status=cached['status'], content_type='application/json')
        
        # Forward request to Ollama
        if request.method == 'GET':
            resp = requests.get(target_url, params=forward_args, headers=headers, timeout=FORWARD_TIMEOUT)
        elif request.method == 'POST':
            resp = requests.post(target_url, data=body, headers=headers, timeout=FORWARD_TIMEOUT, stream=False)
        elif request.method == 'PUT':
            resp = requests.put(target_url, data=body, headers=headers, timeout=FORWARD_TIMEOUT)
        elif request.method == 'DELETE':
            resp = requests.delete(target_url, headers=headers, timeout=FORWARD_TIMEOUT)
        else:
            resp = requests.request(request.method, target_url, data=body, headers=headers, timeout=FORWARD_TIMEOUT)
        
        # Save to cache after successful response
        if resp.status_code == 200:
            cache.set(cache_key, {"status": resp.status_code, "body": resp.text})
            logger.debug(f"Cached response for key: {cache_key[:16]}...")
        
        # Forward response
        if should_log:
            response_data = {
                "status_code": resp.status_code,
                "headers": dict(resp.headers),
                "content": resp.text[:10000] if len(resp.text) > 10000 else resp.text
            }
            
            if 'text/event-stream' in resp.headers.get('Content-Type', ''):
                response_data["stream"] = True
                save_response(folder_path, response_data)
                
                def generate():
                    for chunk in resp.iter_content(chunk_size=None):
                        yield chunk
                
                response = Response(generate(), status=resp.status_code)
                response.headers = dict(resp.headers)
                return response
            else:
                save_response(folder_path, response_data)
                response = Response(resp.content, status=resp.status_code)
                response.headers = dict(resp.headers)
                return response
        else:
            # Forward without logging
            if 'text/event-stream' in resp.headers.get('Content-Type', ''):
                def generate():
                    for chunk in resp.iter_content(chunk_size=None):
                        yield chunk
                
                response = Response(generate(), status=resp.status_code)
                response.headers = dict(resp.headers)
                return response
            else:
                response = Response(resp.content, status=resp.status_code)
                response.headers = dict(resp.headers)
                return response
                
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
        error_data = {
            "error": "Proxy error",
            "message": str(e)
        }
        if should_log:
            save_response(folder_path, error_data)
        return Response(json.dumps(error_data), status=500, mimetype='application/json')
