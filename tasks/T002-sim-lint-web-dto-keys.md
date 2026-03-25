# T002 — `sim-lint` strip list = `buildWebExecute` strip list

**Golden:** [`a2a-server/scripts/sim-lint.ts`](../a2a-server/scripts/sim-lint.ts) `RECEIVED_EXECUTE_CLIENT_ONLY_KEYS` must match client `INTERNAL_CLIENT_ACTION_KEYS` (see T001).

**Goal:** CI cannot pass sim-lint while client code strips a different set than the linter enforces on `received.json`.

**Acceptance:**
- Documented single source: either import a shared const from a tiny `a2a-server`/`a2a-client` shared package, or add a unit test in `a2a-server` that reads both lists and asserts equality (scripted string parse if needed).
- Run `npm run sim:lint -- --all` unchanged or stricter.

**Note:** `CLIENT-SDK-IDEAL.md` mentions stripping `debug`; if you add `debug` to DTO, update sim-lint and any golden `received.json` in a follow-up.
