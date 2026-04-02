# Sync form choices descriptions

**Status:** done (2026-04-02)
**Tracked in:** [`work/STATE.md`](../work/STATE.md) — row S13, plus `simulations/sync/*/response.json`.

## Goal

Every `execute.form` in `simulations/sync` that exposes `choices` should include a non-empty `description` (per the schema) so UI buttons and routers render helpful context and tests can verify the fallback `staticTailChoices` contract.

## Scope

1. Walk through each sync step that emits `form.choices` (e.g., router, human gates, summary confirmations, orchestrator dialogs) and ensure the `description` field exists.
2. Document any `choices` that rely on dynamic text meant for humans (e.g., long summaries) and decide whether to replace them with clearer static text or keep the dynamic string in the description.
3. Re-run `sim:check-md` / `sim:quality` or `sim:validate` to ensure no schema violations appear.

## Acceptance

- [x] Every `execute.form.choices` object in `simulations/sync` contains a `description` entry that matches the semantics used by the router / client UI.
- [x] `shared/router-static-choices.json` still matches the `choices` (stable `id`, `label`, `description`).
- [x] No schema warnings appear for missing `description` fields when running the sim validators.
