# AGENTS.md

Guidance for agents working in this repository.

**Self-Upgrade:** Two phases - 1) Execute tasks from `tasks/` + `DEV_STATE`, 2) When empty, run Task Monitor (`npm run monitor`) to process `prompts-to-agent-mode/` via Client API sessions.

## Quick Reference

| Topic | Reference |
|-------|-----------|
| **Operator workstation** | Autonomous AI workstation with multi-turn async sessions. [`README.md`](README.md) *Project positioning* |
| **Live stack bootstrap** | **`start-all.bat`** from repo root for full stack control ([`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md)) |
| **Hot-reload policy** | No restart needed after code edits by default — services auto-reload |
| **Unified manual path** | Client API only: create session → `mode: "agent"` → `task` → `next` + poll `async` |
| **Task Monitor** | **`npm run monitor`** — canonical driver for `prompts-to-agent-mode/` |
| **Central orchestrator** | **`npm run central`** — full offline gate + monitor pass |
| **Self-Upgrade order** | Do `tasks/` first, then `prompts-to-agent-mode/` via monitor |
| **Schema debugging** | Start with [`tests/direct-tests/README.md`](tests/direct-tests/README.md) |
| **Offline validators** | [`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md) |
| **Empty queue policy** | Empty queue triggers maintenance — prune → discover → write tasks |
| **Evidence rule** | Every iteration must record runtime evidence |
| **Async-only transport** | Never add sync invoke or disable promise queue |

### Empty Queue Policy
"Nothing in queue" ≠ "work finished". Always: 1) Prune completed items, 2) Discover new work, 3) Write tasks. Then run Task Monitor if still empty. Never stop without this maintenance cycle.

### Evidence Rule
Every iteration must record runtime evidence: run concrete check (test/session/curl/script), capture identifiers/signals, write to `DEV_STATE`. No evidence = no closure.

---

## Critical Rules

### Schema Debugging (MANDATORY)
Start with [`tests/direct-tests/README.md`](tests/direct-tests/README.md) for shape issues. Use [`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md) for offline checks.

### Action-Key Shape (MANDATORY)
Use single action type: `{ "execute": { "script": {...} } }` or `{ "result": { "read-file": {...} } }`

### Async-only Transport (MANDATORY)
Stack is async end-to-end. Never disable promise queue or add sync paths.

### Client-Server Data Separation (MANDATORY)
Maintain strict separation: client must not send internal data to server, server must not leak internal processing to client.

### Agent-over-Agent Safety (MANDATORY)
When editing as autonomous agent: preserve architecture, apply minimal diffs, state goals/risks before changes.

### Recursive-Agent Safety (MANDATORY)
Guard against loops/self-modification. Label self-management as EXPERIMENTAL.

---

## Extended reference

Operator walkthrough (Client API, router beats, iteration traps), A2A protocol, env/ports, API tables, debugging, testing, common issues, ADRs, glossary slice, DEV_STATE protocol detail, operational checklist: **[`docs/AGENTS-REFERENCE.md`](docs/AGENTS-REFERENCE.md)**.

Driver checklist and curl narrative: **[`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md)**.
