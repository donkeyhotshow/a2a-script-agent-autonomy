# S10 — Router docs vs shared/router-static-choices.json

**Status:** partial — `simulations/sync/agent/1` aligned with `router-static-choices.json`; repeat check when adding new registry choices or other sync sim router steps.  
**Tracked in:** [`work/STATE.md`](../work/STATE.md) (row S10)

## Canonical source

- Static fallback choices: [`shared/router-static-choices.json`](../shared/router-static-choices.json).
- Runtime keyword and registry routing may prepend action choices; tail ids include `dialog`, `agent`, `task-decomposition`, and scripted actions. See server request processor under `a2a-server/src/services/core/request-processor/`.

## Drift checks

When changing golden `execute.form.choices`, compare ids and copy to `router-static-choices.json` and AGENTS.md router notes.

## Sims

- `simulations/sync/agent/description.md`
- `simulations/sync/script/1/response.json` (scenario copy may differ; ids must stay stable where aligned with registry).
