"""
Rules / logging should see assistant text when the model used tool_calls (content often empty string).
"""

from proxy.ai_hub_config import _extract_prompt


def test_extract_prompt_includes_tool_call_metadata_for_rule_matching():
    body = {
        "messages": [
            {"role": "user", "content": "run tool"},
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [{"id": "call_1", "type": "function", "function": {"name": "x", "arguments": "{}"}}],
            },
        ]
    }
    text = _extract_prompt(body)
    assert "call_1" in text or "x" in text, "expected tool_calls to contribute to extracted prompt"
