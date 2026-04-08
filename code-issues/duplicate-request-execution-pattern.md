# Code Duplication: Request Execution Pattern

The pattern of rate limiting, delay checking, request execution, latency calculation, and tracking is repeated in `generate`, `chat`, and `embeddings` methods across all provider implementations.

**Locations:**
- `openai_compatible_provider.py`: generate (lines 63-82), chat (lines 84-152), embeddings (lines 154-203)
- `huggingface_provider.py`: generate (lines 53-124), chat (lines 126-160), embeddings (lines 162-216)
- `compat_llm_provider.py`: generate (lines 139-179), chat (lines 195-243), embeddings (lines 250-291)

**Recommendation:** Create a helper method for the request execution pattern to reduce repetition.