"""
Content Processor Module
Handles content processing and LLM response content extraction
"""
from typing import Optional

from .promise_utils import _safe_json_loads


def _extract_llm_content_for_body_md(body: bytes, content_type: Optional[str]) -> bytes:
    """
    For LLM provider JSON responses (e.g. GLM / OpenAI-style),
    extract the assistant message content and store only that
    in body.md so upper layers see the plain model answer.
    """
    if not body:
        return body

    if not content_type or 'json' not in content_type.lower():
        return body

    parsed = _safe_json_loads(body)
    if not isinstance(parsed, dict):
        return body

    content: Optional[str] = None
    choices = parsed.get('choices')
    if isinstance(choices, list) and choices:
        first = choices[0] or {}
        if isinstance(first, dict):
            message = first.get('message') or {}
            if isinstance(message, dict):
                maybe_content = message.get('content')
                if isinstance(maybe_content, str):
                    content = maybe_content

    if isinstance(content, str) and content.strip():
        return content.encode('utf-8')

    return body