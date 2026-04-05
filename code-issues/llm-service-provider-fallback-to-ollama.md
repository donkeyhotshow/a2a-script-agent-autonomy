# `LlmService`: non-Ollama providers still use Ollama/hub path

**File:** `a2a-server/src/services/llm/llm-service.ts` (`chat`, ~lines 45–53)

**Problem:** `openai`, `gemini`, and `anthropic` branches comment “placeholder” then call `chatOllama` — same hub/Ollama pipeline as `ollama`. Callers setting `provider: 'openai'` do not get OpenAI semantics or billing isolation; behavior is misleading.

**Done when:** Real provider adapters, or reject unsupported providers with a clear error until implemented.
