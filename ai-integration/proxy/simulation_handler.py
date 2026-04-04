"""
Simulation Handler Module
Handles simulation of responses based on rules
"""
import time
import logging
from typing import Optional, Any, Dict
from flask import Response

logger = logging.getLogger(__name__)

from .ai_hub_config import _build_simulated_body
from .promises import _json_bytes


def handle_simulated_response(
    simulate_action: Dict[str, Any],
    resolved_model: Optional[str],
    prompt: str,
    path: str,
    body_json: Optional[Dict[str, Any]],
    should_log: bool,
    folder_path: str,
) -> Response:
    """
    Handle simulated response for non-promise mode.
    """
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
        request_json=body_json,
    )
    response = Response(sim_body, status=status_code)
    response.headers['Content-Type'] = sim_headers.get('Content-Type', content_type)
    for k, v in sim_headers.items():
        if str(k).lower() == 'content-type':
            continue
        response.headers[str(k)] = str(v)

    if should_log:
        from .promises import save_response
        save_response(folder_path, {
            "status_code": status_code,
            "headers": dict(response.headers),
            "content": (sim_body[:10000].decode('utf-8', errors='replace') if isinstance(sim_body, (bytes, bytearray)) else str(sim_body))[:10000],
            "simulated": True,
        })
    return response


def handle_virtual_show_response(
    cfg: Dict[str, Any],
    model_q: str,
    should_log: bool,
    folder_path: str,
) -> Optional[Response]:
    """
    Handle virtual model show response.
    """
    from .ai_hub_config import _get_virtual_model, _virtual_show_response
    vm = _get_virtual_model(cfg, model_q.strip())
    if vm is not None:
        body_obj = _virtual_show_response(vm)
        body_bytes = _json_bytes(body_obj)
        response = Response(body_bytes, status=200, mimetype='application/json')
        if should_log:
            from .promises import save_response
            save_response(folder_path, {
                "status_code": 200,
                "headers": {"Content-Type": "application/json"},
                "content": body_bytes[:10000].decode('utf-8', errors='replace'),
                "simulated": True,
                "virtual_model": vm.get('name') or vm.get('key'),
            })
        return response
    return None