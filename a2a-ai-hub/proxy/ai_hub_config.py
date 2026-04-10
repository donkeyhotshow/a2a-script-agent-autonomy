"""
AI Hub Configuration Module
Handles config loading, rule processing, and virtual models
"""
import os
import json
import re
import threading
import hashlib
import datetime
import time
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

from .config import AI_HUB_CONFIG


_CONFIG_LOCK = threading.Lock()
_CONFIG_CACHE: Optional[dict] = None
_CONFIG_MTIME: Optional[float] = None
_CONFIG_PATH: Optional[str] = None
_WARNED_NO_HUB_PATH = False
_WARNED_MISSING_HUB_FILES: set[str] = set()


_TRUTHY = {'1', 'true', 'yes', 'y', 'on', 't'}


def _is_truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in _TRUTHY
    return False


def _default_ai_hub_config_path() -> Optional[str]:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    candidates = [
        os.path.join(base_dir, 'docs', 'ai-hub.config.json'),
        os.path.join(base_dir, 'docs', 'ai-hub.config.example.json'),
    ]
    for p in candidates:
        if os.path.isfile(p):
            return p
    return None


def _compile_rules(rules: Any) -> list[dict]:
    compiled: list[dict] = []
    if not isinstance(rules, list):
        return compiled

    for idx, rule in enumerate(rules):
        if not isinstance(rule, dict):
            continue
        if rule.get('enabled') is False:
            continue

        when = rule.get('when') if isinstance(rule.get('when'), dict) else {}
        then = rule.get('then')
        if then is None:
            continue

        compiled_rule = {
            'id': str(rule.get('id') or f'rule_{idx}'),
            'when': when,
            'then': then,
        }

        path_regex = when.get('path_regex')
        if isinstance(path_regex, str) and path_regex.strip():
            try:
                compiled_rule['_path_re'] = re.compile(path_regex)
            except re.error as e:
                logger.warning(
                    "Invalid path_regex for rule %s: %s — pattern ignored",
                    compiled_rule["id"],
                    e,
                )

        prompt_regex = when.get('prompt_regex')
        if isinstance(prompt_regex, str) and prompt_regex.strip():
            try:
                compiled_rule['_prompt_re'] = re.compile(prompt_regex, flags=re.IGNORECASE | re.MULTILINE)
            except re.error as e:
                logger.warning(
                    "Invalid prompt_regex for rule %s: %s — pattern ignored",
                    compiled_rule["id"],
                    e,
                )

        compiled.append(compiled_rule)

    return compiled


def _normalize_config(raw: Any) -> dict:
    if not isinstance(raw, dict):
        logger.warning("AI hub config root must be a JSON object; got %s", type(raw).__name__)
        raw = {}

    model_aliases_raw = raw.get('model_aliases')
    model_aliases: dict[str, str] = {}
    if isinstance(model_aliases_raw, dict):
        for k, v in model_aliases_raw.items():
            if isinstance(k, str) and isinstance(v, str) and k.strip() and v.strip():
                model_aliases[_normalize_model_key(k)] = v.strip()

    strict_model_aliases = _is_truthy(raw.get('strict_model_aliases', False))
    rules = _compile_rules(raw.get('rules', []))

    virtual_models_raw = raw.get('virtual_models')
    virtual_models: dict[str, dict] = {}
    if isinstance(virtual_models_raw, dict):
        for key, spec in virtual_models_raw.items():
            if not isinstance(key, str) or not key.strip():
                continue
            if not isinstance(spec, dict):
                continue
            name = spec.get('name') if isinstance(spec.get('name'), str) and spec.get('name').strip() else key.strip()
            virtual_models[_normalize_model_key(key)] = {
                "key": key.strip(),
                "name": name,
                "tags": spec.get('tags') if isinstance(spec.get('tags'), dict) else {},
                "show": spec.get('show') if isinstance(spec.get('show'), dict) else {},
            }

    return {
        'model_aliases': model_aliases,
        'strict_model_aliases': strict_model_aliases,
        'rules': rules,
        'virtual_models': virtual_models,
    }


def get_ai_hub_config() -> dict:
    global _CONFIG_CACHE, _CONFIG_MTIME, _CONFIG_PATH, _WARNED_NO_HUB_PATH

    config_path = AI_HUB_CONFIG or _default_ai_hub_config_path()
    if not config_path:
        if not _WARNED_NO_HUB_PATH:
            logger.warning(
                "AI_HUB_CONFIG unset and no default docs/ai-hub.config(.example).json; using empty hub rules"
            )
            _WARNED_NO_HUB_PATH = True
        return {'model_aliases': {}, 'strict_model_aliases': False, 'rules': [], 'virtual_models': {}}

    try:
        stat = os.stat(config_path)
        mtime = stat.st_mtime
    except FileNotFoundError:
        if config_path not in _WARNED_MISSING_HUB_FILES:
            logger.warning("AI_HUB_CONFIG file not found: %s (empty hub rules)", config_path)
            _WARNED_MISSING_HUB_FILES.add(config_path)
        return {'model_aliases': {}, 'strict_model_aliases': False, 'rules': [], 'virtual_models': {}}

    with _CONFIG_LOCK:
        if _CONFIG_CACHE is not None and _CONFIG_MTIME == mtime and _CONFIG_PATH == config_path:
            return _CONFIG_CACHE

        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                raw = json.load(f)
        except (json.JSONDecodeError, OSError, UnicodeDecodeError) as e:
            logger.error(
                "Could not load AI_HUB_CONFIG=%s: %s (using empty rules)",
                config_path,
                e,
                exc_info=True,
            )
            raw = {}

        _CONFIG_CACHE = _normalize_config(raw)
        _CONFIG_MTIME = mtime
        _CONFIG_PATH = config_path
        return _CONFIG_CACHE


def _normalize_path(path: str) -> str:
    """Strip leading/trailing slashes so `/api/chat` and `/api/chat/` match the same rule path."""
    return (path or '').strip().strip('/')


def _normalize_model_key(model: str) -> str:
    model = (model or '').strip().lower()
    model = re.sub(r'[\s_]+', '-', model)
    return model


def _message_content_to_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, (int, float, bool)):
        return str(content)
    if isinstance(content, list):
        segments: list[str] = []
        for block in content:
            if isinstance(block, dict):
                txt = block.get('text')
                if isinstance(txt, str) and txt:
                    segments.append(txt)
                else:
                    inner = block.get('content')
                    if isinstance(inner, str) and inner:
                        segments.append(inner)
            elif isinstance(block, str):
                segments.append(block)
        return '\n'.join(segments)
    return ''


def _extract_prompt(body_json: Optional[dict]) -> str:
    if not isinstance(body_json, dict):
        return ''
    prompt = body_json.get('prompt')
    if isinstance(prompt, str):
        return prompt
    messages = body_json.get('messages')
    if isinstance(messages, list):
        parts: list[str] = []
        for msg in messages:
            if not isinstance(msg, dict):
                continue
            content = msg.get('content')
            text = _message_content_to_text(content)
            if text:
                parts.append(text)
            tool_calls = msg.get('tool_calls')
            if tool_calls and isinstance(tool_calls, list):
                try:
                    tc_s = json.dumps(tool_calls, default=str)
                except (TypeError, ValueError):
                    tc_s = str(tool_calls)
                if not text:
                    parts.append(tc_s)
                elif tc_s:
                    parts.append(tc_s)
        return '\n'.join(parts)
    return ''


def _listify(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _get_virtual_model(config: dict, model: Optional[str]) -> Optional[dict]:
    if not model or not isinstance(model, str):
        return None
    virtual_models = config.get('virtual_models') or {}
    if not isinstance(virtual_models, dict):
        return None
    key = _normalize_model_key(model)
    return virtual_models.get(key)


def _virtual_tags_entry(virtual_spec: dict) -> dict:
    name = virtual_spec.get('name') if isinstance(virtual_spec.get('name'), str) else virtual_spec.get('key', 'virtual')
    digest = f"sha256:{hashlib.sha256(name.encode('utf-8')).hexdigest()}"
    base = {
        "name": name,
        "model": name,
        "modified_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "size": 0,
        "digest": digest,
        "details": {},
    }
    tags = virtual_spec.get('tags') if isinstance(virtual_spec.get('tags'), dict) else {}
    merged = dict(base)
    merged.update(tags)
    merged.setdefault("name", name)
    merged.setdefault("model", merged.get("name", name))
    merged.setdefault("details", {})
    return merged


def _virtual_show_response(virtual_spec: dict) -> dict:
    name = virtual_spec.get('name') if isinstance(virtual_spec.get('name'), str) else virtual_spec.get('key', 'virtual')
    base = {
        "model": name,
        "license": "Apache-2.0",
        "details": {},
        "parameters": "",
        "template": "{{ .Prompt }}",
        "modelfile": "",
    }
    show = virtual_spec.get('show') if isinstance(virtual_spec.get('show'), dict) else {}
    merged = dict(base)
    merged.update(show)
    merged.setdefault("model", name)
    merged.setdefault("details", {})
    return merged


def _match_when(when: dict, *, method: str, path: str, requested_model: Optional[str], resolved_model: Optional[str], prompt: str, compiled_rule: dict) -> bool:
    # method
    method_cond = when.get('method')
    if method_cond is not None:
        allowed = {str(m).upper() for m in _listify(method_cond) if m is not None}
        if allowed and method.upper() not in allowed:
            return False

    # path
    path_norm = _normalize_path(path)
    if isinstance(when.get('path'), str) and _normalize_path(when['path']) != path_norm:
        return False
    if isinstance(when.get('path_prefix'), str) and not path_norm.startswith(_normalize_path(when['path_prefix'])):
        return False
    path_re = compiled_rule.get('_path_re')
    if path_re is not None and not path_re.search(path_norm):
        return False

    # model
    model_cond = when.get('model')
    requested_model_key = _normalize_model_key(requested_model or '') if requested_model else ''
    resolved_model_key = _normalize_model_key(resolved_model or '') if resolved_model else ''
    if model_cond is not None:
        allowed = {_normalize_model_key(str(m)) for m in _listify(model_cond) if isinstance(m, (str, int, float))}
        if allowed and (requested_model_key not in allowed) and (resolved_model_key not in allowed):
            return False

    requested_cond = when.get('requested_model')
    if requested_cond is not None:
        allowed = {_normalize_model_key(str(m)) for m in _listify(requested_cond) if isinstance(m, (str, int, float))}
        if allowed and requested_model_key not in allowed:
            return False

    resolved_cond = when.get('resolved_model')
    if resolved_cond is not None:
        allowed = {_normalize_model_key(str(m)) for m in _listify(resolved_cond) if isinstance(m, (str, int, float))}
        if allowed and resolved_model_key not in allowed:
            return False

    # prompt
    prompt_contains = when.get('prompt_contains')
    if prompt_contains is not None:
        needles = [str(x) for x in _listify(prompt_contains) if x is not None]
        if needles and not any(n in (prompt or '') for n in needles):
            return False

    prompt_re = compiled_rule.get('_prompt_re')
    if prompt_re is not None and not prompt_re.search(prompt or ''):
        return False

    return True


def _safe_format(template: Any, **kwargs: Any) -> Any:
    if not isinstance(template, str):
        return template
    try:
        return template.format(**kwargs)
    except (KeyError, ValueError) as e:
        logger.warning("template format failed (using raw template): %s", e)
        return template


def _build_simulated_body(action: dict, *, model: Optional[str], prompt: str, path: str, request_json: Optional[dict]) -> tuple[bytes, str]:
    """
    Returns (body_bytes, content_type).
    """
    builder = action.get('builder')

    # raw body
    if not builder:
        # First check for 'response' key (simple simulate)
        response_text = action.get('response')
        if response_text is not None:
            if isinstance(response_text, (dict, list)):
                return _json_bytes(response_text), 'application/json'
            return str(response_text).encode('utf-8'), 'text/plain; charset=utf-8'
        
        # Then check for 'body' key
        body = action.get('body')
        if body is not None:
            if isinstance(body, (dict, list)):
                return _json_bytes(body), 'application/json'
            return str(body).encode('utf-8'), 'text/plain; charset=utf-8'
        
        # Default to empty
        return b'', 'application/octet-stream'

    builder = str(builder)

    if builder == 'compat_llm.generate':
        text = _safe_format(action.get('text', ''), model=model or '', prompt=prompt or '', path=_normalize_path(path))
        resp = {
            "model": model or (request_json or {}).get('model') or "unknown",
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "response": text if isinstance(text, str) else str(text),
            "done": True,
        }
        extra = action.get('extra')
        if isinstance(extra, dict):
            resp.update(extra)
        return _json_bytes(resp), 'application/json'

    if builder == 'openai.chat_completions':
        text = _safe_format(action.get('text', ''), model=model or '', prompt=prompt or '', path=_normalize_path(path))
        resp = {
            "id": f"chatcmpl_{uuid.uuid4().hex[:12]}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model or (request_json or {}).get('model') or "unknown",
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": text if isinstance(text, str) else str(text)},
                    "finish_reason": "stop",
                }
            ],
        }
        extra = action.get('extra')
        if isinstance(extra, dict):
            resp.update(extra)
        return _json_bytes(resp), 'application/json'

    # unknown builder -> treat as raw text
    body = action.get('text', '')
    return str(body).encode('utf-8'), 'text/plain; charset=utf-8'


def _json_bytes(obj: Any) -> bytes:
    return json.dumps(obj, ensure_ascii=False).encode('utf-8')
