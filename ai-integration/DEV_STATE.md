# DEV_STATE - ai-integration (2026-03-27)

Current operational state for the `ai-integration` module.

---

## Why This File Exists

- Keep only module-specific facts, risks, and next actions.
- Speed up session handoff without re-discovery.
- Avoid stale/abstract TODO lists that are not executable.

---

## Scope Boundary

- This file stores only `ai-integration` state.
- Cross-module decisions stay in root [`../DEV_STATE.md`](../DEV_STATE.md).
- Do not mirror client/server backlog here.

---

## Runtime Snapshot

| Component | Port | Status |
|-----------|------|--------|
| AI Proxy | 11434 | Expected healthy |
| Ollama | 11435 | Expected healthy |
| Promise daemon | n/a | Enabled via config |

**2026-04-03:** Promise completion (`proxy/promises.py`): `_promise_set_done` does not mark a promise `done` on non-2xx HTTP **or** on 2xx with a JSON `error` envelope (OpenAI-style), including when `Content-Type` omits `json`. `is_llm_upstream_response_ok()` gates **all** LLM response caches: `proxy_handler.py` (sync path: no store + reject bad hits), `daemon.py` / `promise_routes.py` (invalidate poisoned cache entries on read). Tests: `tests/test_promises_llm_failure.py`.

**2026-04-03 (API keys):** Upstream auth is driven by `config/providers.json` → `api_keys[]` (each entry: `id`, `provider`, `secret`, `priority`, `enabled`). Ollama uses placeholder secret `__OLLAMA_LOCAL__` (no `Authorization`). Z.AI and other cloud rows use real secrets; `${Z_AI_API_KEY}` still resolves from env. On HTTP 429 or JSON `error.code` **1302** (rate limit), the proxy tries the next key for the same provider. Implementation: `proxy/api_key_routing.py`, `proxy_handler.py`, `daemon.py` (reads `routing.json`), `proxy/providers/config_loader.py`.
**Docs:** [`docs/configuration/PROVIDERS_AND_API_KEYS.md`](docs/configuration/PROVIDERS_AND_API_KEYS.md).
**Bootstrap:** `config/providers.example.json` (tracked) → copy to `config/providers.json` (gitignored); `python scripts/ensure-providers-config.py` if missing.

---

## Fast Checks

```bash
curl http://localhost:11434/health
curl http://localhost:11434/daemon/status
curl http://localhost:11435/api/tags
```

---

## Active Risks

- [x] Timeout values tuned for qwen3:8b: CONNECT_TIMEOUT=10s, REQUEST_TIMEOUT=120s, LLM_TIMEOUT=180s

---

## Next Actions (Executable)

### Proxy Tags Normalization (Multi-Provider Model List)

**Task:** Normalize `/api/tags` endpoint to combine models from multiple providers (Z.AI + Ollama) into unified list while routing requests to correct backend.

**Requirements:**
1. `/api/tags` returns combined list: Z.AI models (e.g., `glm-4.7-flash`) + Ollama models (e.g., `qwen3:8b`)
2. Each model entry includes `provider` field indicating backend system (`z_ai` or `ollama`)
3. Model selection in request routes to correct provider:
   - `glm-4.7-flash` → Z.AI provider
   - `qwen3:8b` → Ollama provider
4. Maintain backward compatibility with existing `virtual_models` config

**Files to modify:**
- `proxy/proxy_handler.py` - Update `/api/tags` handler to query all providers
- `proxy/providers/router.py` - Add `get_all_models()` method for tags aggregation
- `proxy/providers/base.py` - Add model metadata method if needed
- `proxy/ai_hub_config.py` - Add provider-aware model entries

**Cross-module impact:**
- a2a-server must support `model` parameter in requests (propagate to AI Hub)
- ADR needed: multi-provider model routing contract

**Status:** Done (core, 2026-04-03) — same as above; `docs/api-reference/PROXY_API.md` documents `GET /api/tags`. a2a-server uses per-invoke `llmModel` (see root ADR-0059). Optional: rich Web UI picker only.

**Priority:** High (wiring complete; UI polish backlog)

---

- Все текущие action steps выполнены и зафиксированы.
- Оставляем только активные вопросы/риски, если появятся (например, изменение SLAs внешних провайдеров, обновление конфигов timeout).
- Уточненный статус: module is stable, health checks green.

### Proposed: Black Room (Algorithm Mode)

**Concept:** Local Ollama execution layer for deterministic algorithmic tasks, complementing Gray Room's Prompt Mode.

- **Location:** This module (`ai-integration`) — manages direct Ollama communication
- **Trigger:** `interrupt.reason: "algorithm_invoke"` from a2a-server Gray Room
- **Algorithm IDs:** `ctx-gather-*`, `edit-apply-*`, `pattern-match-*`, `validate-*`
- **Docs:** [`docs/BLACK-ROOM.md`](docs/BLACK-ROOM.md) — full architecture and protocol
- **ADR:** [`../docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md`](../docs/adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md)
- **Status:** Proposed, not yet implemented


---

## Resilience Features (AI-01)

### Promise Retry Mechanism (Completed 2026-04-03)

Implemented in [`proxy/promises.py`](proxy/promises.py) and [`proxy/daemon.py`](proxy/daemon.py):

- **Error state handling**: Promises with errors are not skipped; instead marked for retry
- **Delayed retry**: Error promises scheduled for retry after 10-second delay using `next_attempt_at` timestamp
- **Daemon collection**: Modified `_collect_pending_promises()` to include error promises ready for retry
- **Consistent delay**: All error conditions (network failures, missing snapshots) use 10-second delay before retry
- **Status preservation**: Error promises remain in 'error' status until daemon processes them, then reset to 'pending'
- **Verified**: Test script confirmed error promises become eligible for retry after delay expires

### Provider Connection Resilience

Implemented in [`proxy/providers/ollama_provider.py`](proxy/providers/ollama_provider.py):

- **Exponential backoff**: 1s → 2s → 4s → 8s → 16s → 30s (max)
- **Max retries**: 5 attempts before marking as failed
- **Connection states**: `connected`, `reconnecting`, `disconnected`, `failed`
- **Logging**: Each connection attempt is logged with delay info
- **Recovery detection**: When connection recovers, logs "recovered" status

### Endpoint: `/daemon/status`

Returns provider connection status:

```json
{
  "enabled": true,
  "running": true,
  "poll_interval": 5.0,
  "auto_execute": true,
  "providers": {
    "ollama": {
      "name": "ollama",
      "connection_state": "connected",
      "last_error": null,
      "health": "healthy"
    }
  }
}
```

### Verification Steps

1. Stop Ollama via docker-compose
2. Send async request
3. Start Ollama
4. Check `/daemon/status` - should show "recovered" within 30s

---

## Key References

- [README.md](README.md)
- [proxy/config.py](proxy/config.py)
- [proxy/providers/ollama_provider.py](proxy/providers/ollama_provider.py)
- [proxy/daemon_routes.py](proxy/daemon_routes.py)
- [scripts/cleanup_artifacts.py](scripts/cleanup_artifacts.py)
- [scripts/cleanup-old-artifacts.py](scripts/cleanup-old-artifacts.py) (enhanced: +cache cleanup, 7d logs, 14d pending, 30d completed)
- [scripts/tests/daemon_resilience.py](scripts/tests/daemon_resilience.py)
- [docs/api-reference/PROXY_API.md](docs/api-reference/PROXY_API.md)
- [docs/troubleshooting/TROUBLESHOOTING.md](docs/troubleshooting/TROUBLESHOOTING.md) — §9 upstream key limits (1302), auth (1001/401), retry behavior
- PROXY_API.md subsection *Upstream provider JSON errors* — code table + link to §9

---

## Code Cleanup Discovery Plan (AI Integration: where/how)

- [x] **CCP-AI-01 where-to-scan**: Primary folders for cleanup scans зафиксированы: `proxy/`, `scripts/`, `config/`, `tests/`.
- [x] **CCP-AI-02 signal-set (CDM-02)**: (1) duplicate adapters, (2) legacy compatibility bridges, (3) dead exports, (4) unused route branches, (5) overlapping DTO/response builders. **How:** ripgrep `provider`, `proxy`, `daemon`, `cleanup`, `compat`, `deprecated`, `re-export` across CCP-AI-01 folders; verify each route in `proxy/` is reachable from app entry.
- [x] **CDM-03 evidence format**: Each cleanup candidate must be recorded as one row: `path` · `why redundant` · `usage proof` · `safe removal check` (pytest / health curls as applicable).
- [x] **CCP-AI-03 bridge-detection** (2026-03-27): No standalone compat shim layer: integration surface is `proxy/` (FastAPI app + routes) and `proxy/providers/` (Ollama provider implements the shared provider contract). “Bridges” are normal adapter boundaries, not temporary re-exports; refactors follow provider API changes, not a separate removal calendar.
- [x] **CCP-AI-04 dead-path-check** (2026-03-27): Same bar as CDM-03 — before deleting a module, prove no imports from `proxy/` / `scripts/` entrypoints and run applicable checks (`pytest`, [`scripts/tests/daemon_resilience.py`](scripts/tests/daemon_resilience.py), health curls from **Fast Checks**).
- [x] **CCP-AI-05 safe-remove-gate (CDM-04)** (2026-03-27): Do not merge removals without `curl` health on `11434` (and Ollama `11435` if LLM paths touched) plus targeted tests; full proxy behavior = manual/async smoke as in **Resilience Features** / daemon docs.

---

Updated: 2026-04-03 (Promise retry mechanism implemented)