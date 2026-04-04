# ADR-0080: Multi-LLM Shim

## Status
Approved

## Context
A2A is currently optimized for a single LLM provider. To increase resilience and cost-efficiency, we need to support multiple providers (OpenAI, Gemini, Anthropic, Ollama, DeepSeek).

## Decision
Implement an `LLMShim` layer that abstract provider-specific APIs behind a unified interface. Use environment variables like `A2A_PROVIDER` and `A2A_MODEL` to define routing and fallbacks.

## Consequences
- No vendor lock-in.
- Ability to use specialized models for specific tasks (e.g., small models for summarization).
- Improved availability through fallbacks.
