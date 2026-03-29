# ADR compliance via Client API (battle test)

Canonical description of how an **orchestrator client** uses the **same Client API** as the web UI to **test the live stack in battle**: it submits work (messages / steps) whose purpose is to **update and verify code against ADR documents**, not only to run offline sims or unit tests.

Progress is **resumable** via a **dedicated state file** (separate from A2A session storage). That file remembers **which ADRs are queued, completed, and active**, and **which phase** of compliance applies to the **current** ADR.

## Why this is not obvious

- **Sessions vs invoke vs agent:** one-page split in root **`AGENTS.md`** (*Sessions, tests, and agent mode*), plus [ADR-0028](../docs/adr/ADR-0028-client-api-deployment-modes.md) and [ADR-0030](../docs/adr/ADR-0030-unified-agent-mode.md).
- Default docs emphasize simulations, unit tests, health curls, and generic “tasks.” They rarely say in one place: **orchestration for ADR compliance is driven through the Client API** (`sessions`, `next`, async poll), with prompts scoped to “make the codebase match ADR *X*.”
- Readers often equate “testing” with `sim:lint` / `npm test` only. **Battle testing** here means the full path Client → Server → LLM/tools → local edits, with **explicit ADR-backed goals**.
- **Session JSON** (under `a2a-client/storage/sessions/…`) holds conversation steps; it is **not** the right single source for “ADR queue + per-ADR phase + completed set.” Without a called-out **external state file**, restarts lose orchestration position and people assume every run must **glob or list all** `docs/adr/` files.

## Goals

1. **Battle test**: Exercise Client API → Server → LLM/tooling on real ADR-scoped prompts, not only health curls.
2. **ADR as spec**: Each queued item is one ADR file (or stable id); work is “verify and update code per that ADR.”
3. **Resumable**: Restarts and long runs **do not** rescan or re-enumerate the whole ADR tree as the queue; position lives in the state file.
4. **Project-scoped**: The orchestrator **binds to one target project** (repo root and Client `project` metadata). All paths, sessions, and state refer to that workspace only.

## State file (separate from A2A session JSON)

| Store | Role |
|-------|------|
| **A2A session** | Step history, server `execute` / `result`, messages. |
| **ADR compliance state file** | Curated **queue** of ADR paths, **current** ADR, **phase within** that ADR, **completed** ADRs, optional **display window** for UI/logs. |

Keep the file **small**; the orchestrator owns it. Example locations (pick one convention):

- Next to the target project: `.a2a/adr-compliance-state.json`, or  
- Repo-local tooling: `runtime/adr-compliance-state.json` with an embedded `projectRoot`.

Suggested shape (illustrative):

```json
{
  "projectRoot": "C:/workspace/org-carrier/a2a-script-agent",
  "queue": [
    "docs/adr/ADR-0026-server-llm-request-prep.md",
    "docs/adr/ADR-0028-client-api-deployment-modes.md"
  ],
  "currentIndex": 0,
  "currentAdrPath": "docs/adr/ADR-0026-server-llm-request-prep.md",
  "currentPhase": "map-scope",
  "phases": ["map-scope", "audit-code", "apply-changes", "verify-sims"],
  "phaseNotes": {},
  "completedAdrs": [],
  "displayWindow": 3
}
```

Field notes:

- **`queue`**: **Curated** list of ADR paths — the orchestration backlog. **Do not** treat “list every file under `docs/adr`” as the queue each run; only what you put in `queue` is in play (plus completed history).
- **`currentIndex` / `currentAdrPath`**: Active ADR document.
- **`currentPhase` + `phases`**: Progress **within** the current ADR (many `/next` round-trips per document).
- **`completedAdrs`**: ADRs fully passed for this project run (criteria are yours: audit + changes + sims/tests).
- **`displayWindow`**: Optional; show only the **next N** queue entries (order preview). **Full queue remains in the file** — UI does not need to dump the entire backlog.

## Per-ADR rule

For the **current** ADR, drive verification and fixes across **all code (and sims) that fall under that ADR’s scope** before advancing that ADR to `completedAdrs`. The state file records **partial progress** (`currentPhase`, notes) so a stopped run can resume on the **same document** without restarting from zero.

## Client API loop (same as operators; project-bound)

1. Ensure the session / client configuration targets the **same** `projectRoot` as the state file.
2. `POST /api/a2a/sessions` (body includes project/session metadata as your client already does).
3. `POST /api/a2a/sessions/{id}/next` — message is the **next concrete step** for the current ADR/phase (e.g. “Per ADR-0026, list files that still fold `result` wrong”).
4. `GET /api/a2a/sessions/{id}/async` (or promise poll) until idle.
5. Read server `execute` / `result`, apply local file edits if the agent used tools, run sims/tests if required.
6. **Update the state file** after each successful sub-step (phase advance, or next ADR).

Repeat until `queue` is drained and each ADR has passed your completion criteria.

## Relationship to other docs

- Orchestrator persona (RU): [`methodology/orchestrator-api-exploit.md`](orchestrator-api-exploit.md)
- Operator HTTP examples: [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md)
- ADR index: [`docs/adr/README.md`](../docs/adr/README.md)

## Implementation note

This document is **normative for methodology** only. A **reference driver** may still be a separate script that reads/writes the state JSON; the **Vite Client API** (`a2a-client/vite-plugin-a2a`) supports **step 1** alignment: `POST /api/a2a/sessions` (and task-add / task-execute) accept **`projectId`** and **`projectRoot`** (must match a path registered in client `projects.json`) when using **`x-storage-mode: project`**, and persist **`context.projectRoot`** as the resolved absolute path. **`GET`/`DELETE` `/sessions/:id`** accept optional **`?projectId=`** or **`?projectRoot=`** (same registration rules; `projectRoot` wins when both are sent). **`PUT`** body may include **`projectRoot`** to locate the session. Default state file path helper: **`.a2a/adr-compliance-state.json`** under that project (`a2a-client/vite-plugin-a2a/storage/adrComplianceState.js`). **`POST .../next`** is handled by the invoke/step pipeline (not a no-op stub) so operators and orchestrators share the same path as the UI.
