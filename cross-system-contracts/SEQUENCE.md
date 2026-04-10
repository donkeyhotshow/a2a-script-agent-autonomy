# Sequence — cross-system shape / parameter issues

**When to use:** Live stack (web, Client API, server, proxy) shows a bad or surprising payload; `simulations/` still look fine. Follow **in order**; skip steps only when inapplicable.

---

## 0 — Name the boundary

Decide which handoff broke (one primary):

| Boundary | Typical symptom | First evidence |
|----------|-----------------|----------------|
| Hub ↔ LLM | Malformed model JSON, wrong fields in body | `ai-integration/proxy_logs/promises/<id>/body.md`, `response.json` |
| Server ↔ hub | Invoke vs what hub returned | Same + `a2a-server/storage/requests/` if present |
| Client ↔ server | `execute` / `context` / DTO mismatch | `a2a-client/storage/sessions/.../server-response.json`, `request-to-server.json` |
| UI ↔ Client API | Step stored wrong, wrong `next` body | `client-result.json`, same step folder |

---

## 1 — Freeze identifiers and folders

1. Note **`promiseId`** (async), **`sessionId`**, **step folder** (highest step with `server-response.json` if relevant).
2. Optional **single-file narrative:** `npm run report:promise -- <promiseId> --out scratch/trace-<id>.md` — [`scripts/promise-artifacts-report.mjs`](../scripts/promise-artifacts-report.mjs) (server request JSON + Gray Room fields + client refs + `proxy_logs` listing).
3. **Copy** the smallest set of files into `cross-system-contracts/scratch/<short-label>/` (gitignored) *before* running `cleanup-session-state.js` or wiping storage.

---

## 2 — Establish baseline (simulations)

1. Find the **closest golden** under `simulations/` (same action type or dialog if possible).
2. Run: `npm run sim:lint -- --all` (or narrow scope) and `npm run sim:validate -- --all` when the change touches sim contract.

**Rule:** Sim output is the **reference**; live divergence is the bug unless the sim is obsolete (then update sim in the same fix).

---

## 3 — Run offline validators (repo root)

**All-in-one (recommended):** `npm run cross-system:validate` — runs promise scan, session scan (if `a2a-client/storage/sessions` exists), `verify:gray-room` on the **newest** `server-response.json` that has **`workbench.sections.sequence`** (otherwise step 3 is SKIP), then sim choice audit. Skips missing proxy/session trees. Details: [`PRACTICE.md`](PRACTICE.md).

Or run individually (see [`tests/direct-tests/validators/README.md`](../tests/direct-tests/validators/README.md)):

1. LLM / proxy bodies: `npm run scan-promise-bodies`
2. Session server responses: `npm run scan-session-responses`
3. Gray room / workbench: `npm run verify:gray-room -- <path-to-json>` (or rely on `cross-system:validate` when a sequence snapshot exists)
4. Router choices in sims: `npm run audit:sim-choice-descriptions`

Record **exact script name** and **pass/fail** in the backlog row.

**New fixture folder:** `npm run cross-system:new-fixture -- <slug>`

---

## 4 — Diff expected vs actual

1. Open frozen `scratch/` (or live paths if still present).
2. Compare to [`simulations/SCHEMA.md`](../simulations/SCHEMA.md), `AGENTS.md` action-key rules, and validator messages.
3. One sentence: **what field or shape is wrong** and **where it appears first** (proxy vs server vs client).

---

## 5 — Log the hunt

Add or update a row in [`tasks/pending/cross-system-parameter-hunt.md`](../tasks/pending/cross-system-parameter-hunt.md): symptom, systems, evidence path, validators, status `open`.

---

## 6 — Optional curated fixture

If the issue is likely to regress:

1. Add `cross-system-contracts/fixtures/<slug>/` with `meta.json` + excerpt per [`fixtures/README.md`](fixtures/README.md).
2. Link the slug from the backlog row.

---

## 7 — Fix and close the loop

1. Implement fix in the **owning** package (minimal change).
2. Re-run validators from step 3; re-run affected sims from step 2.
3. One live smoke: Client API `POST /sessions` → `/next` → poll `/async` (or Task Monitor) if the bug was end-to-end.
4. Set backlog status to **`fixed`**, note commit or PR; update `meta.json` if a fixture exists.

---

## References

- Hub index: [`README.md`](README.md)
- Schema debugging: [`tests/direct-tests/README.md`](../tests/direct-tests/README.md)
