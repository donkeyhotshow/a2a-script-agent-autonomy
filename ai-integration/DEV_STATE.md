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
- [docs/troubleshooting/TROUBLESHOOTING.md](docs/troubleshooting/TROUBLESHOOTING.md)

---

## Code Cleanup Discovery Plan (AI Integration: where/how)

- [x] **CCP-AI-01 where-to-scan**: Primary folders for cleanup scans зафиксированы: `proxy/`, `scripts/`, `config/`, `tests/`.
- [x] **CCP-AI-02 signal-set (CDM-02)**: (1) duplicate adapters, (2) legacy compatibility bridges, (3) dead exports, (4) unused route branches, (5) overlapping DTO/response builders. **How:** ripgrep `provider`, `proxy`, `daemon`, `cleanup`, `compat`, `deprecated`, `re-export` across CCP-AI-01 folders; verify each route in `proxy/` is reachable from app entry.
- [x] **CDM-03 evidence format**: Each cleanup candidate must be recorded as one row: `path` · `why redundant` · `usage proof` · `safe removal check` (pytest / health curls as applicable).
- [x] **CCP-AI-03 bridge-detection** (2026-03-27): No standalone compat shim layer: integration surface is `proxy/` (FastAPI app + routes) and `proxy/providers/` (Ollama provider implements the shared provider contract). “Bridges” are normal adapter boundaries, not temporary re-exports; refactors follow provider API changes, not a separate removal calendar.
- [x] **CCP-AI-04 dead-path-check** (2026-03-27): Same bar as CDM-03 — before deleting a module, prove no imports from `proxy/` / `scripts/` entrypoints and run applicable checks (`pytest`, [`scripts/tests/daemon_resilience.py`](scripts/tests/daemon_resilience.py), health curls from **Fast Checks**).
- [x] **CCP-AI-05 safe-remove-gate (CDM-04)** (2026-03-27): Do not merge removals without `curl` health on `11434` (and Ollama `11435` if LLM paths touched) plus targeted tests; full proxy behavior = manual/async smoke as in **Resilience Features** / daemon docs.

---

Updated: 2026-03-27