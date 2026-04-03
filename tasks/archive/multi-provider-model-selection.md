# Multi-Provider Model Selection

**Status:** done (core + Settings default model + `llmModel` on create). Optional: per-session picker on floating panel.

**Goal:** Enable model selection throughout the stack with Z.AI (`glm-4.7-flash`) and Ollama (`qwen3:8b`) appearing in a unified list.

## Background

Currently ai-integration proxy has:
- Default provider: Z.AI (`z_ai`)
- Fallback to Ollama for local models
- `/api/tags` returns models from the routed provider + virtual models

User needs both model types visible in one list, with requests routing correctly based on selection.

## Requirements

### Phase 1: Proxy Normalization (ai-integration)

1. **`/api/tags` aggregation**
   - Query all enabled providers for their models
   - Return unified list with `provider` field per model
   - Example:
     ```json
     {
       "models": [
         {"name": "glm-4.7-flash", "provider": "z_ai", ...},
         {"name": "qwen3:8b", "provider": "ollama", ...}
       ]
     }
     ```

2. **Model-based routing**
   - If request specifies `model: "glm-4.7-flash"` → route to Z.AI
   - If request specifies `model: "qwen3:8b"` → route to Ollama
   - Default behavior preserved when no model specified

3. **Files to modify**
   - `proxy/proxy_handler.py` - Update `/api/tags` handler
   - `proxy/providers/router.py` - Add `get_all_models()` method
   - `proxy/providers/base.py` - Add model metadata method

### Phase 2: Server Integration (a2a-server)

1. **Propagate model parameter**
   - From request context to AI Hub invoke payload
   - Support `model` in `execution` or `context` fields

2. **Files to modify**
   - `services/core/request-processor/llm-orchestration.ts`
   - `services/utils/invoke.service.ts`

### Phase 3: Client UI (a2a-client)

1. **Model selector** — **done (baseline):** Settings modal loads `GET /api/a2a/models` (Vite proxy → `AI_HUB_URL` `/api/tags`); stored default applies to **`POST /sessions`** as `llmModel` (`project-manager` + `state-managers.createNewSession`). Per-session picker on floating panel not implemented (optional).

2. **Files**
   - `packages/vite-plugin/routes/modelsRoutes.js`, `packages/vite-plugin/index.js`
   - `web/index.html`, `web/js/app/event-handlers.js`, `web/js/app/project-manager.js`, `web/js/app/state-managers.js`, `web/js/api-integration.js`

## Acceptance Criteria

- [x] `/api/tags` returns both Z.AI and Ollama models when both providers enabled (ai-integration)
- [x] Each model entry has `provider` field indicating backend (when proxy aggregates)
- [x] Requests with explicit `model` route to correct provider
- [x] a2a-server propagates model selection to ai-integration
- [x] ADR documenting multi-provider model contract (ADR-0059)

## Simulations

- Authoring map: [`simulations/LLM-BACKEND-MAP.md`](../simulations/LLM-BACKEND-MAP.md) — ports, `/api/tags` owner, optional YAML on `request.md`, future `request.json` fields.
- Canonical pointer: [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) section *LLM provider / model*.

## Related

- `ai-integration/DEV_STATE.md` - Module state
- `docs/adr/` - Architecture decision records
