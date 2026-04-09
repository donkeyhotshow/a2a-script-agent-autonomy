"""
LLM Response Formatter Module
Handles formatting of LLM responses to ensure consistent markdown output
"""
import json
import logging
import re
from typing import Optional

logger = logging.getLogger(__name__)


def format_llm_response(raw_response: str) -> str:
    """
    Format raw LLM response to ensure consistent markdown output.

    Args:
        raw_response: Raw response from LLM provider

    Returns:
        Formatted markdown string
    """
    if not raw_response:
        return ""

    try:
        # Remove any leading/trailing whitespace
        formatted = raw_response.strip()

        # If it's empty after stripping, return empty string
        if not formatted:
            return ""

        # Ensure we have markdown code blocks for structured content
        # Detect JSON-like content and wrap in code blocks
        if _looks_like_json(formatted):
            # Check if it's already wrapped in code blocks
            if not (formatted.startswith('```') and formatted.endswith('```')):
                formatted = f"```json\n{formatted}\n```"
        elif _looks_like_code(formatted):
            # Detect code-like content and wrap appropriately
            if not (formatted.startswith('```') and formatted.endswith('```')):
                # Try to detect language
                lang = _detect_code_language(formatted)
                if lang:
                    formatted = f"```{lang}\n{formatted}\n```"
                else:
                    formatted = f"```\n{formatted}\n```"

        # Ensure proper paragraph separation
        formatted = _ensure_paragraph_separation(formatted)

        return formatted

    except Exception as e:
        # If formatting fails, return a safe fallback with error indication
        logger.warning(f"LLM response formatting failed: {e}, returning raw response")
        # Return raw response but wrapped in a warning
        return f"""**Warning: Response formatting failed. Raw response below:**

```
{raw_response}
```"""


def _looks_like_json(text: str) -> bool:
    """Check if text looks like JSON content."""
    text = text.strip()
    return (text.startswith('{') and text.endswith('}')) or \
           (text.startswith('[') and text.endswith(']'))


def _looks_like_code(text: str) -> bool:
    """Check if text looks like code content."""
    # Simple heuristics for code detection
    lines = text.split('\n')
    if len(lines) == 1:
        return False
    
    # Check for common code patterns
    code_indicators = [
        r'^\s*(def|class|function|const|let|var)\s+',
        r'^\s*(if|else|for|while|try|catch)\s*\(',
        r'^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*[:=]',
        r'^\s*[{}();]',
        r'^\s*</?[a-zA-Z]',
        r'^\s*#',
        r'^\s*//',
        r'^\s*/\*',
    ]
    
    for line in lines[:min(5, len(lines))]:  # Check first 5 lines
        line = line.strip()
        if not line:
            continue
        for pattern in code_indicators:
            if re.match(pattern, line):
                return True
    
    return False


def _detect_code_language(text: str) -> Optional[str]:
    """Detect programming language from code text."""
    text_lower = text.lower()
    
    # Language detection heuristics
    if any(keyword in text_lower for keyword in ['def ', 'import ', 'from ', 'print(', 'elif ', 'none']):
        return 'python'
    elif any(keyword in text_lower for keyword in ['function ', 'var ', 'let ', 'const ', '=>', 'console.log']):
        return 'javascript'
    elif any(keyword in text_lower for keyword in ['public ', 'private ', 'class ', 'extends ', 'implements ']):
        return 'java'
    elif any(keyword in text_lower for keyword in ['#include ', 'int main', 'printf(', 'cin>>', 'cout<<']):
        return 'cpp'
    elif any(keyword in text_lower for keyword in ['<html>', '<!DOCTYPE', '<div', '<span', '</p>']):
        return 'html'
    elif any(keyword in text_lower for keyword in ['background:', 'color:', 'font-size:', 'margin:', 'padding:']):
        return 'css'
    elif any(keyword in text_lower for keyword in ['SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'CREATE TABLE']):
        return 'sql'
    
    return None


def _ensure_paragraph_separation(text: str) -> str:
    """Ensure proper paragraph separation in text."""
    # Split by lines and process
    lines = text.split('\n')
    processed_lines = []
    
    for i, line in enumerate(lines):
        processed_lines.append(line)
        
        # Add blank line after certain block elements (but not inside code blocks)
        if i < len(lines) - 1:  # Not the last line
            line_stripped = line.strip()
            next_line_stripped = lines[i + 1].strip()
            
            # Add separation after headers, lists, etc.
            if (line_stripped.startswith('#') and 
                not next_line_stripped.startswith('#') and 
                next_line_stripped != ''):
                processed_lines.append('')
            elif (re.match(r'^\s*[-*+]\s+', line_stripped) or  # Unordered list
                  re.match(r'^\s*\d+\.\s+', line_stripped)):    # Ordered list
                if not (next_line_stripped.startswith('-') or 
                       next_line_stripped.startswith('*') or
                       next_line_stripped.startswith('+') or
                       re.match(r'^\s*\d+\.\s+', next_line_stripped)):
                    if next_line_stripped != '':
                        processed_lines.append('')
    
    return '\n'.join(processed_lines)


def clean_llm_response_for_storage(raw_response: str) -> str:
    """
    Clean LLM response for storage in body.md (extract assistant content).
    This is used internally by the promise system.
    
    Args:
        raw_response: Raw response from LLM provider
        
    Returns:
        Cleaned response suitable for storage
    """
    if not raw_response:
        return ""
    
    # First try to extract content from common LLM response formats
    cleaned = _extract_assistant_content(raw_response)
    
    # If no structured content found, return cleaned raw response
    if not cleaned or cleaned == raw_response:
        # Basic cleanup
        cleaned = raw_response.strip()
        
        # Remove common API wrapper artifacts
        cleaned = re.sub(r'^"|"$', '', cleaned)  # Remove surrounding quotes
        cleaned = cleaned.replace('\\n', '\n').replace('\\t', '\t')
    
    return cleaned


def _extract_assistant_content(response: str) -> str:
    """
    Extract assistant content from various LLM response formats.
    
    Args:
        response: Raw LLM response
        
    Returns:
        Extracted assistant content or original response if no format detected
    """
    response = response.strip()
    
    # Try to parse as JSON
    try:
        import json
        parsed = json.loads(response)
        
        # OpenAI/GPT-like format: {"choices": [{"message": {"content": "..."}}]}
        if isinstance(parsed, dict) and 'choices' in parsed:
            choices = parsed['choices']
            if isinstance(choices, list) and len(choices) > 0:
                first_choice = choices[0]
                if isinstance(first_choice, dict):
                    message = first_choice.get('message', {})
                    if isinstance(message, dict) and 'content' in message:
                        content = message['content']
                        if isinstance(content, str):
                            return content
        
        # Anthropic Claude-like format: {"content": [{"type": "text", "text": "..."}]}
        if isinstance(parsed, dict) and 'content' in parsed:
            content = parsed['content']
            if isinstance(content, list) and len(content) > 0:
                first_item = content[0]
                if isinstance(first_item, dict) and first_item.get('type') == 'text':
                    text = first_item.get('text', '')
                    if isinstance(text, str):
                        return text
        
        # Google Gemini-like format: {"candidates": [{"content": {"parts": [{"text": "..."}]}}]}
        if isinstance(parsed, dict) and 'candidates' in parsed:
            candidates = parsed['candidates']
            if isinstance(candidates, list) and len(candidates) > 0:
                first_candidate = candidates[0]
                if isinstance(first_candidate, dict):
                    content = first_candidate.get('content', {})
                    if isinstance(content, dict):
                        parts = content.get('parts', [])
                        if isinstance(parts, list) and len(parts) > 0:
                            first_part = parts[0]
                            if isinstance(first_part, dict) and 'text' in first_part:
                                text = first_part['text']
                                if isinstance(text, str):
                                    return text
        
        # Simple format: {"response": "..."}
        if isinstance(parsed, dict) and 'response' in parsed:
            response_field = parsed['response']
            if isinstance(response_field, str):
                return response_field
        
        # Simple format: {"text": "..."}
        if isinstance(parsed, dict) and 'text' in parsed:
            text_field = parsed['text']
            if isinstance(text_field, str):
                return text_field
                
    except (json.JSONDecodeError, TypeError, AttributeError):
        # Not JSON or parsing failed, return original
        pass
    
    # If we couldn't extract structured content, return original
    return response