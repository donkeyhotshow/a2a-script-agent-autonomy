# Sync simulations: sparse `request.md` / `response.md` coverage

## Fact

Under `simulations/sync/`, only **~33** step folders include `request.md` and `response.md` (LLM snapshot pair). The rest are **no-LLM / deterministic** goldens: fine for execute shape, but **weak** for regressions in:

- prompt assembly (`render-markdown`, `pick-context`, `truncate-*`);
- per-action request templates in `a2a-server/prompts/`.

High-value flows with **no** LLM fixtures today include large swaths of `fix-vue-imports*`, `fix-laravel-*`, `phpunit-deprecations`, `resilience-contract`, `orchestrator-dialog`, many `task-decomposition` steps, etc.

## Done when

- [ ] Prioritize 2–3 flows (e.g. orchestrator + one scripted fix path) and add `request.md`/`response.md` (+ matching transform files per `SCHEMA.md`) for at least one representative step each **or** document explicitly that these sims are **shape-only** and not prompt-contract tests.
- [ ] If shape-only: add one line to `simulations/sync/README.md` under “Key characteristics” so authors do not assume full pipeline files exist everywhere.
