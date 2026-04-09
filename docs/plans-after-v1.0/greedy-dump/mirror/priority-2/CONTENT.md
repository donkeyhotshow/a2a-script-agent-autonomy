# priority-2 — content summary

**Approx. file count:** ~6264  
**Subfolders:** `a2a`, `agent.openrouter.ai`, `laravel-agent-workspace-tools`.

**Content:** Directly relevant to A2A and agent tooling—primary merge candidate after priority-1.

## Verified structure (2026-03-29)

| Slice | Status | Notes |
|-------|--------|-------|
| `a2a/` | stub | Contains subdirs: `goose`, `kilo`, `openhands`, `pilot-try` (actual agent repos) |
| `agent.openrouter.ai/` | stub | Not inspected |
| `laravel-agent-workspace-tools/` | **Laravel: yes** | Full Laravel project (artisan, app/, config/, routes/, composer.json) - **primary Laravel candidate** |

**Laravel relevance:** `laravel-agent-workspace-tools` is clearly Laravel (has artisan, app/Http, routes/web.php, etc.). The `scripts/` folder likely contains tools we can convert to server actions.
