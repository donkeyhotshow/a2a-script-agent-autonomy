# script — central scripted-flow golden (`sync/script`)

**Primary** multi-step sync simulation for **server-orchestrated script pipelines**: router → forms → several **`execute.script`** rounds (client returns **`result.script`**) → **`run-script`** → human **`form` choices** → **`execute-command`** → auto **`message`** summary → closing **`form`** input (same *shape classes* as `sync/agent`, different story).

Domain sims (`fix-vue-imports/*`, `phpunit-deprecations`, …) stay **smaller** scenario tests; this folder is the **one long checklist** for script + Web DTO parity.

## Case: “multi-phase import / audit pipeline”

Fictional **fix-vue-imports**-style flow with **10** turns: confirm scope, scan, resolve, npm script, merge audit, operator gate, shell sanity check, generated summary, optional follow-up.

## Steps

| # | `execute` (single key) | Role |
|---|------------------------|------|
| 1 | `form` | Router |
| 2 | `form` | Scope / confirm (`input`) |
| 3 | `script` | Phase A — scan (server asks client to run script) |
| 4 | `script` | Phase B — resolve (after `result.script`) |
| 5 | `run-script` | Packaged npm script (after `result.script`) |
| 6 | `script` | Phase C — audit merge (after `result.run-script`) |
| 7 | `form` | Human gate (`choices`) |
| 8 | `execute-command` | After `proceed` |
| 9 | `message` | Auto summary text |
| 10 | `form` | Follow-up input (optional next task) |

All steps are **no-LLM** fixtures (`server-transforms-request.json` only; no `server-transforms-response.json`).

Each step has **`request.md` / `response.md`** whose first ` ```json ` fence matches the sibling JSON (for `cd a2a-server && npm run sim:check-md`).

## Orchestration

Server emits `execute.script` / `run-script` / `execute-command`; client answers with **`result.script`**, **`result.run-script`**, **`result.execute-command`**. Human **`form`** steps and the closing **`message`** are server-side (summary can be templated). Implementation: `a2a-client/shared/web-execute-dto.mjs`.

## Run

```bash
npm run sim:validate -- --sim sync/script/10
npm run sim:lint -- --sim sync/script/5
npm run sim:quality
```

## Live Client API smoke (not goldens)

With the dev stack up (`start-all.bat`), exercise the Client API (`/api/a2a/sessions` + `/next` + poll `/async`), e.g. `node tests/direct-tests/e2e-dialog-test.js` or `node tests/agent-dialog-runner.mjs`.

Related: [`tasks/script-dialog-agent-response-parity.md`](../../../tasks/script-dialog-agent-response-parity.md), [`simulations/sync/agent/description.md`](../agent/description.md) (parallel “full chain” for agent).
