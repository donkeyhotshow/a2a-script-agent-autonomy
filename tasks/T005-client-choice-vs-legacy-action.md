# T005 — Client: prefer `result.choice` over legacy `actions[]`

**Golden:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md) — router uses `execute.form.choices` + `result.choice`; legacy `actions[]` / `result.action` is deprecated.

**Code:** `a2a-client/web` and SDK routes that submit step results (`client.json` equivalents).

**Goal:** New UI paths send `result.choice` with stable IDs from `ROUTER_CHOICES` / server form metadata; legacy branches only where old sessions still exist.

**Acceptance:**
- List call sites of `result.action` or `actions[]` handling; reduce or gate behind version/session flag.
- Align at least one end-to-end flow with a golden sim that uses `choices` (e.g. `agent/1` → `agent/2`).
