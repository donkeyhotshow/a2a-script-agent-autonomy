# Cross-system contracts hub

**Purpose:** One place to track **wrong or mismatched return shapes** that only show up **between** components (client API, server invoke, AI integration proxy, storage). Unit tests inside one package often miss these; evidence lives in **each system’s on-disk stores**.

**Baseline vs live stack:** **`simulations/`** are the **clean** contract surface — fixed golden pipeline (`sim:lint` / `sim:validate`). The **live** path (web UI, Client API, `a2a-server`, AI hub/proxy) is where **drift and bad shapes** show up first; compare failing runs to the nearest sim or validator output, then log here.

## Where runtime evidence lives (read-only for humans/agents)

| System | Typical paths | What to inspect |
|--------|---------------|-----------------|
| AI Integration | `ai-integration/proxy_logs/promises/<id>/` | `body.md`, `response.json`, `meta.json` — raw LLM ↔ proxy contract |
| Client API / UI | `a2a-client/storage/sessions/<sess>/<step>/` | `server-response.json`, `request-to-server.json`, `client-result.json` |
| A2A Server | `a2a-server/storage/requests/` (if enabled) | Invoke snapshots |
| Simulations | `simulations/` | Goldens: `request.json` / `response.json` pipeline |

**Cleanup:** `cleanup-session-state.js` at repo root empties several of these; **copy** anything you need into `fixtures/` or `scratch/` before cleanup.

## Offline checks (fast)

- **Bundle:** `npm run cross-system:validate` (validators in fixed order; see [`SEQUENCE.md`](SEQUENCE.md)).
- **Sims:** `npm run sim:lint`, `npm run sim:validate` (delegates to `a2a-server`).
- **Individual validators:** `scan-promise-bodies`, `scan-session-responses`, `verify:gray-room`, `audit:sim-choice-descriptions` — details: [`tests/direct-tests/validators/README.md`](../tests/direct-tests/validators/README.md).
- **New fixture scaffold:** `npm run cross-system:new-fixture -- <slug>`

## This folder layout

| Path | Role |
|------|------|
| [`fixtures/`](fixtures/) | **Committed** curated minimal repros + `meta.json` (stable for CI/docs). |
| `scratch/` | **Gitignored** — drop full copies from `proxy_logs` / sessions while debugging; promote the smallest repro to `fixtures/`. |

## Workflow

**Full step order:** [`SEQUENCE.md`](SEQUENCE.md) (boundary → freeze evidence → sim baseline → validators → diff → backlog → optional fixture → fix).

**Operator notes (bundle script):** [`PRACTICE.md`](PRACTICE.md) — what `npm run cross-system:validate` actually does, skips, timing, exit codes.

Short form:

1. Reproduce across boundary → capture IDs (`promiseId`, `sessionId`, step folder).
2. Run relevant validators; note which script flagged the issue.
3. Add or update a row in [`../tasks/pending/cross-system-parameter-hunt.md`](../tasks/pending/cross-system-parameter-hunt.md).
4. Optional: add a **`fixtures/<slug>/`** entry with `meta.json` + excerpt JSON/MD (see [`fixtures/README.md`](fixtures/README.md)).

## References

- Action-key shape: `AGENTS.md`, [`simulations/SCHEMA.md`](../simulations/SCHEMA.md)
- Schema debugging entry: [`tests/direct-tests/README.md`](../tests/direct-tests/README.md)
