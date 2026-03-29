# Session prompt: project orientation → Laravel sub-agent + sort / describe

Use the **copy-paste block** as the initial message. It forces a **startup phase** that grounds work in **this repo**, then aims at a **strict Laravel-only universal sub-agent** with **full tooling** to **normalize content for LLMs** while keeping **economy** (tokens and calls) high.

---

## Copy-paste prompt

```
You are working in repository **a2a-script-agent** (branch `greedy-dump` or `main`).

================================================================================
PHASE 0 — PROJECT ORIENTATION (mandatory first; do not skip)
================================================================================
1. Read **README.md** (root) — stack: `start-all.bat` / `start-all.sh` from repo root; ports 5173 Client API + web, 3000 A2A server, ai-integration / Ollama per AGENTS.md.
2. Read **AGENTS.md** — unified Client API path: POST `/api/a2a/sessions` → `/next` → poll `/async`; router two beats (`message` vs `choice`); **action-key shape** for execute/result; DEV_STATE protocol.
3. Skim **a2a-server** role: stateless invoke, transforms, **script** and other actions — this is where server-side “tools” for an agent live.
4. Skim **a2a-client** — session persistence, step folders — operator surface for the same contract as the UI.
5. Summarize in 5–8 bullets: what this project *is*, what it is *not*, and how an external “sub-agent” would call it (Client API + agent mode seed).

**Output of Phase 0:** Short “Project lens” note (markdown) — save or append to **greedy-dump/STATE.md** log section *or* user’s chosen file; cite paths you actually read.

================================================================================
NORTH STAR — UNIVERSAL SUB-AGENT (STRICT SCOPE: LARAVEL ONLY)
================================================================================
**Intent:** Use this stack as a **reusable sub-agent** dedicated **strictly to Laravel applications** (PHP/Laravel repos, Artisan, Blade, migrations, queues, Horizon, Sanctum, etc.). Non-Laravel projects are out of scope unless the user explicitly widens it.

**How to apply this project toward that goal:**
- **Driving layer:** Client API sessions with `mode: agent` (or equivalent seed) and tasks that reference a **Laravel project root** (`projectRoot` / project storage as supported).
- **Tooling layer:** Implement and register **server actions** (script/read/transform) so the agent has a **complete toolkit**: align/normalize code and docs for LLM consumption (formatting, extract routes/listeners, inventory env keys without secrets, generate structured summaries).
- **Content for LLM:** All tool outputs should be **structured** (sections, single-purpose chunks) so upstream LLM calls are **cheap and deterministic** — tables over prose where possible, avoid duplicate context.
- **Economy:** Enforce **one action key** per step; batch reads in one script where safe; avoid redundant `invoke` chains; prefer sync when acceptable; document token-saving conventions in TASK descriptions.

**Deliverable (conceptual this session unless user asks to code):** A short “Laravel sub-agent profile” — which existing pieces map to it (Client API, actions, workbench), and which greedy-queue slices are **Laravel-relevant** (e.g. `priority-2/laravel-agent-workspace-tools`) vs neutral.

================================================================================
PHASE 1 — SORTING AND DESCRIPTION (greedy dump queue)
================================================================================
**Goal:** Order and accurate **short descriptions** of the import queue so scripts can later become **a2a-server actions** aligned with the Laravel sub-agent profile.

Rules:
1. Read **greedy-dump/SOURCE.md** — originals stay on disk; no large binaries in git.
2. Use **greedy-dump/TASK-TREE.md** and **greedy-dump/STATE.md** — update STATE after each meaningful pass.
3. Per folder slice: **CONTENT.md** / **SUBTREE.md** must match reality — scripts vs assets, duplicates (e.g. aleon in two trees), **Laravel relevance** tag where obvious.
4. Review order: **priority-1** → **priority-2** (prioritize **laravel-agent-workspace-tools** and **a2a** for pattern alignment) → **priority-3** rows; defer **priority-6** backups unless a script is referenced.
5. No executable scripts → say so in **TASK.md** + **greedy-dump/docs/DOCUMENTS-STATE.md**.
6. **DEV_STATE.md** — short bullet under Greedy dump when queue changes.
7. Follow **AGENTS.md** for future code; this phase is **documentation + queue hygiene** unless the user asks for implementation.

**Deliverables:**
- TASK-TREE checkboxes updated where verified.
- CONTENT / SUBTREE lines corrected; optional **Laravel:** yes/no/maybe per slice.
- STATE.md cursor + dated log line.

Stop when: scope satisfied, or blockers listed (path missing, access denied).

================================================================================
OPTIONAL — Client API seed (after Phase 0)
================================================================================
`task`: "Phase 0 project lens + sort/describe next unchecked slice in greedy-dump/TASK-TREE.md; update STATE and DOCUMENTS-STATE."

`mode`: `agent`

(projectId / projectRoot pointing at a Laravel app when exercising tools.)
```

---

## Why this shape

| Piece | Role |
|-------|------|
| Phase 0 | Stops generic advice; forces **this repo’s** contracts and startup (`start-all`, Client API). |
| Laravel-only sub-agent | **Strict product boundary** — universal *within Laravel*, not all stacks. |
| Tools + LLM content | Server **actions** + structured workbench/context = **aligned content for LLM** and **economy**. |
| Phase 1 queue | Keeps **greedy-dump** sort/describe work as a **second** stage after orientation. |

---

## Related files

| File | Role |
|------|------|
| [AGENTS.md](AGENTS.md) | Client API, router, action-key shape |
| [README.md](README.md) | Stack entrypoints |
| [greedy-dump/SOURCE.md](greedy-dump/SOURCE.md) | External work tree path |
| [greedy-dump/TASK-TREE.md](greedy-dump/TASK-TREE.md) | Checkbox tree |
| [greedy-dump/STATE.md](greedy-dump/STATE.md) | Sequence + log |
| [greedy-dump/docs/DOCUMENTS-STATE.md](greedy-dump/docs/DOCUMENTS-STATE.md) | Document ledger |
| [DEV_STATE.md](DEV_STATE.md) | Repo-wide state |
