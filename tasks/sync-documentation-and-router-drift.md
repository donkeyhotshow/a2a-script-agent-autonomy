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
- `simulations/sync/script/1/response.json` — **scenario copy**: `title`/`description`/`label` text are English and specific to the script golden; **`id` values** match `staticTailChoices` (`dialog`, `agent`, `task-decomposition`, `fix-vue-imports`, `fix-laravel-namespaces-and-uses`). When changing shared static choices, keep these ids in sync.

## Router choice `description` audit (2026-04-03)

- Every `choices[]` object under `simulations/**` now includes a non-empty `description` (including nested `result.form.choices` and `server-transforms-request.json` router stubs).
- Touched: `fix-vue-imports/1`, `fix-laravel-namespaces-and-uses/1`, `fix-vue-imports-decline/1` (server-transforms); `fix-vue-imports-decline/4`–`6` (`response.json` / `received.json`); `response.md` for decline `4`–`6` via `sim:check-md --fix`.
- Runtime: `buildRouterForm` / `mergeRouterChoices` in [`a2a-server/src/config/router-static.ts`](../a2a-server/src/config/router-static.ts) already backfills `description` from `label` when missing; simulations still carry explicit text for contract clarity.
- Re-run: `node scripts/audit-sim-choice-descriptions.mjs` (exits 1 if any gap).
