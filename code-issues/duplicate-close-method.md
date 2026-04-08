# Code Duplication: close Method

The `close` method has identical session cleanup logic across providers.

**Locations:**
- `ai-integration/proxy/providers/openai_compatible_provider.py`: Lines 256-259
- `ai-integration/proxy/providers/huggingface_provider.py`: Lines 247-250
- `ai-integration/proxy/providers/compat_llm_provider.py`: Lines 321-323

**Recommendation:** Move `close` method to base class.