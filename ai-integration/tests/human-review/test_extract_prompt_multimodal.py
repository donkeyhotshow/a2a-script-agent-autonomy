"""
Human-review: rule routing uses _extract_prompt; multimodal Ollama bodies use list-shaped content.
Expected: text segments still contribute to the prompt string (rules / logging).
"""

from proxy.ai_hub_config import _extract_prompt


def test_extract_prompt_collects_text_from_multimodal_message_content():
    body = {
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": "hello multimodal"}],
            }
        ]
    }
    assert "hello multimodal" in _extract_prompt(body)
