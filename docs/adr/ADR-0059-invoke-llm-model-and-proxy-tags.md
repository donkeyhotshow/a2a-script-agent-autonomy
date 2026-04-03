# ADR-0059: Per-invoke LLM model and combined proxy tags

**Status:** accepted  
**Date:** 2026-04-03

## Context

The AI Integration proxy serves multiple providers (Z.AI, Ollama, virtual models). The a2a-server dialog and gray-room paths called the hub with model names taken only from environment variables, so sessions could not pin a model per task. `GET /api/tags` needed a single discoverable list with backend attribution.

## Decision

1. **Invoke contract:** Clients may set **`context.llmModel`** (validated optional string in `parseContextBlock`) or top-level **`llmModel`** on `POST /api/v1/invoke`; `invoke.service` copies the latter onto context. Resolution helper `resolveLlmModelFromContext` applies in `DialogRequestProcessor` and inside `GrayRoomOrchestrator` for every `/api/chat` call (main loop and interrupt sidecars), falling back to `LLM_MODEL` / `Z_AI_MODEL` / `OLLAMA_MODEL` / default.

2. **Client API:** `POST /api/a2a/sessions` accepts optional **`llmModel`** in the JSON body; it is stored on `session.context` and merged into invoke context on `/next` when not already set. `pickInvokeContextPatch` preserves `llmModel` when merging server responses.

3. **Proxy:** `GET /api/tags` returns a merged Ollama-shaped list; each model row includes **`provider`** (`z_ai`, `ollama`, `virtual`, …). See `ai-integration/docs/api-reference/PROXY_API.md`.

## Consequences

- Operators can curl `POST /sessions` with `"llmModel": "qwen3:8b"` or pass the same inside `context` on raw invoke.
- UIs can call proxy `GET /api/tags` and show provider labels; selection must use the exact `name`/`model` string in subsequent chat/generate calls.
- Full stack model picker UI remains optional; the contract is API-first.

## Related

- `a2a-server/src/services/core/request-processor/llm-model-resolver.ts`
- `ai-integration/proxy/proxy_handler.py` (`_handle_api_tags_unified`)
- ADR-0058 (Black/Gray split) — complementary routing story
