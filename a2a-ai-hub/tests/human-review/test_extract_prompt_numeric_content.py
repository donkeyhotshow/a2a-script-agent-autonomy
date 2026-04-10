"""Some APIs send numeric content; prompt extraction should still be useful for rules."""

from proxy.ai_hub_config import _extract_prompt


def test_extract_prompt_stringifies_numeric_message_content():
    body = {"messages": [{"role": "user", "content": 404}]}
    assert "404" in _extract_prompt(body)
