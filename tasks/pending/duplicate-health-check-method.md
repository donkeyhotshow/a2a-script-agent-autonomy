# Code Duplication: health_check Method

The `health_check` method follows the same pattern across providers: API key validation, session creation, HTTP GET request, status code checking, exception handling.

**Locations:**
- `ai-integration/proxy/providers/openai_compatible_provider.py`: Lines 206-242
- `ai-integration/proxy/providers/huggingface_provider.py`: Lines 218-244

**Recommendation:** Create a common `health_check` implementation with customizable endpoint URL.