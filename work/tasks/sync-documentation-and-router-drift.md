# Sync simulations: docs + router fixture drift

**Status:** `description.md` for `sync/agent` added (2026-04-01). Router label/description parity + id lint still open.

## Gaps

1. **`simulations/sync/agent/`** — ~~Only simulation under `sync/` **without** `description.md`~~ **Fixed:** see `simulations/sync/agent/description.md`.

2. **Router copy vs `shared/router-static-choices.json`** — e.g. `sync/agent/1` `execute.form.choices` uses **English** helper text (`"Free-form chat; follow-up forms in later steps."`) while the shared JSON uses **Ukrainian** labels/descriptions. **Ids** (`dialog`, `agent`, `task-decomposition`, scripted tails) should stay aligned; label/description drift is easy to miss when the registry changes.

## Done when

- [x] Add `simulations/sync/agent/description.md` (scope: minimal router + agent scratchpad golden).
- [ ] Either refresh `sync/agent/1` (and any other router goldens) from `shared/router-static-choices.json`, **or** add a small check (script or sim-lint rule) that **choice `id` sets** in router `response.json` match the shared tail + `llmPipelineActions` union.
