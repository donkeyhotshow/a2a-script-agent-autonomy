# Code Duplication: _get_session Method

The `_get_session` method is duplicated across provider implementations with nearly identical logic.

**Locations:**
- `ai-integration/proxy/providers/openai_compatible_provider.py`: Lines 54-60
- `ai-integration/proxy/providers/huggingface_provider.py`: Lines 44-50
- `ai-integration/proxy/providers/compat_llm_provider.py`: Lines 132-136 (slightly different, no headers)

**Recommendation:** Extract to base `LLMProvider` class.