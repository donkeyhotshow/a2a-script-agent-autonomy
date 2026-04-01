"""
Model Resolver Module
Handles model name resolution and alias mapping
"""
import logging
from typing import Optional, Tuple, Dict, Any, List

from .ai_hub_config import _normalize_model_key, _extract_prompt, _match_when, _build_simulated_body
from .promises import _json_bytes

logger = logging.getLogger(__name__)


def resolve_model_name(requested_model: Optional[str], config: dict) -> Tuple[Optional[str], Optional[str]]:
    """Resolve model name based on aliases
    
    Args:
        requested_model: The model name or alias requested by user
        config: The AI hub configuration
        
    Returns:
        Tuple of (resolved_model, original_model)
        - resolved_model: The actual model name to use
        - original_model: The original alias that was requested
    """
    if not requested_model or not isinstance(requested_model, str):
        return None, None

    key = _normalize_model_key(requested_model)
    aliases: dict = config.get('model_aliases') or {}

    if key in aliases:
        return aliases[key], requested_model

    if config.get('strict_model_aliases'):
        return None, requested_model

    return requested_model, requested_model


def apply_model_rules(
    body_json: Optional[Dict],
    forward_args: Dict[str, Any],
    request_method: str,
    path: str,
    requested_model: Optional[str],
    resolved_model: Optional[str],
    prompt: str,
    config: Dict
) -> Tuple[Optional[Dict], Optional[str], Optional[str], Optional[Dict]]:
    """Apply model routing rules from config
    
    Args:
        body_json: Request body (for POST/PUT/PATCH)
        forward_args: Query arguments (for GET)
        request_method: HTTP method
        path: Request path
        requested_model: Original requested model
        resolved_model: Currently resolved model
        prompt: Extracted prompt
        config: AI hub config
        
    Returns:
        Tuple of (modified_body, modified_model, modified_prompt, simulate_action)
    """
    simulate_action = None
    current_model = resolved_model
    current_prompt = prompt
    
    # Determine which dict to modify based on method
    target_dict = body_json if request_method in ['POST', 'PUT', 'PATCH'] else forward_args
    
    # Apply rules
    for rule in config.get('rules') or []:
        when = rule.get('when') or {}
        if not isinstance(when, dict):
            continue
            
        if not _match_when(
            when,
            method=request_method,
            path=path,
            requested_model=requested_model,
            resolved_model=current_model,
            prompt=current_prompt,
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
                    mapped, _ = resolve_model_name(new_model, config)
                    final_model = mapped or new_model.strip()
                    if target_dict is not None:
                        target_dict['model'] = final_model
                    current_model = final_model
            elif action_type in {'simulate'}:
                simulate_action = action
                break

        if simulate_action is not None:
            break
    
    # Return modified body
    modified_body = body_json
    if request_method in ['POST', 'PUT', 'PATCH'] and target_dict is not None:
        modified_body = target_dict
        # Convert to bytes
        modified_body = _json_bytes(modified_body) if modified_body else b''
    
    return modified_body, current_model, current_prompt, simulate_action


def get_requested_and_resolved_model(body_json: Optional[Dict], forward_args: Dict, method: str) -> Tuple[Optional[str], Optional[str]]:
    """Extract requested and resolved model from request
    
    Args:
        body_json: Request body (if POST/PUT/PATCH)
        forward_args: Query arguments (if GET)
        method: HTTP method
        
    Returns:
        Tuple of (requested_model, resolved_model)
    """
    from .config import STORAGE_DIR
    
    requested_model = None
    resolved_model = None
    
    # Debug logging
    debug_file = STORAGE_DIR + '/debug.log'
    with open(debug_file, 'a') as f:
        f.write(f"[DEBUG] body_json type: {type(body_json)}, value: {body_json}\n")
    
    if method in ['POST', 'PUT', 'PATCH'] and isinstance(body_json, dict):
        # Check for simulate in body
        direct_simulate = body_json.get('simulate')
        with open(debug_file, 'a') as f:
            f.write(f"[DEBUG] direct_simulate: {direct_simulate}\n")
        
        # Get model from body
        model_val = body_json.get('model')
        if isinstance(model_val, str):
            requested_model = model_val
            # Don't resolve here, do it later with config
    
    elif method == 'GET':
        model_arg = forward_args.get('model')
        if isinstance(model_arg, str) and model_arg.strip():
            requested_model = model_arg
    
    return requested_model, resolved_model


class ModelResolver:
    """Handles model resolution and routing"""
    
    def __init__(self, config: Dict):
        self.config = config
    
    def resolve(self, requested_model: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
        """Resolve model alias to actual model name"""
        return resolve_model_name(requested_model, self.config)
    
    def apply_rules(
        self,
        body_json: Optional[Dict],
        forward_args: Dict,
        method: str,
        path: str,
        prompt: str
    ) -> Tuple[Optional[Dict], Optional[str], Optional[Dict]]:
        """Apply routing rules to request
        
        Returns:
            Tuple of (modified_body, resolved_model, simulate_action)
        """
        requested_model = None
        resolved_model = None
        
        # Get model from appropriate source
        if method in ['POST', 'PUT', 'PATCH'] and isinstance(body_json, dict):
            model_val = body_json.get('model')
            if isinstance(model_val, str):
                requested_model = model_val
        elif method == 'GET':
            model_arg = forward_args.get('model')
            if isinstance(model_arg, str):
                requested_model = model_arg
        
        # Resolve model
        if requested_model:
            resolved_model, _ = resolve_model_name(requested_model, self.config)
        
        # Apply rules
        modified_body, current_model, _, simulate_action = apply_model_rules(
            body_json, forward_args, method, path,
            requested_model, resolved_model, prompt, self.config
        )
        
        return modified_body, current_model, simulate_action
