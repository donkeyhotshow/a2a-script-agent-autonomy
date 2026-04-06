"""Apply model aliases and ai-hub `rules` before forwarding (used by proxy_handler)."""
from typing import Any, Dict, Optional, Tuple

from .ai_hub_config import _extract_prompt
from .model_resolver import apply_model_rules, resolve_model_name


def process_model_and_rules(
    cfg: dict,
    body_json: Optional[Dict[str, Any]],
    forward_args: Optional[Dict[str, Any]],
    request_method: str,
    path: str,
) -> Tuple[Optional[str], Optional[str], str, Optional[Dict[str, Any]]]:
    """
    Returns:
        requested_model — as sent by client (if any)
        resolved_model — after aliases + rules (may be None if unknown strict alias and no rule fixes it)
        prompt — text extracted from body (messages/prompt)
        simulate_action — rule-driven simulate payload, or None
    """
    fa = forward_args or {}
    prompt = _extract_prompt(body_json)

    requested_model: Optional[str] = None
    if request_method in ("POST", "PUT", "PATCH") and isinstance(body_json, dict):
        mv = body_json.get("model")
        if isinstance(mv, str):
            requested_model = mv
    elif request_method == "GET":
        ma = fa.get("model")
        if isinstance(ma, str) and ma.strip():
            requested_model = ma.strip()

    resolved_model: Optional[str] = None
    if requested_model:
        resolved_model, _ = resolve_model_name(requested_model, cfg)

    _modified_body, final_model, _current_prompt, simulate_action = apply_model_rules(
        body_json,
        fa,
        request_method,
        path,
        requested_model,
        resolved_model,
        prompt,
        cfg,
    )

    if isinstance(final_model, str) and final_model.strip():
        fm = final_model.strip()
        if request_method in ("POST", "PUT", "PATCH") and isinstance(body_json, dict):
            body_json["model"] = fm
        elif request_method == "GET":
            fa["model"] = fm

    return requested_model, final_model, prompt, simulate_action
