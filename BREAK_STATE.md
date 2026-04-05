# BREAK_STATE — live failure & evidence (not the task queue)

**Purpose:** When something **does not work** (you said it or an agent finds it), record **symptoms + paths + IDs** here first. **Do not** use this file as the authoritative work queue — that stays [`work/STATE.md`](work/STATE.md) and [`DEV_STATE.md`](DEV_STATE.md). After fix, **prune** resolved rows and optionally add a one-liner to `DEV_STATE.md` *Fixed*.

**Agent rule:** If the user reports breakage **or** investigation turns up a reproducible fault, **write or update** this file before large chat dumps. Prefer **concrete paths** over prose.

---

## Active incidents

| ID | Symptom (one line) | First seen | Status |
|----|--------------------|------------|--------|
| — | *none* | — | — |

*(Replace row: short `inc-YYYYMMDD-n` in Symptom column or add column if you use external tracker.)*

---

## Evidence log (append newest at top)

Template (copy block per incident):

```markdown
### inc-YYYYMMDD-n — <short title>

- **Symptom:**
- **Expected:**
- **Client API session folder:** `a2a-client/storage/sessions/<sess_…>/<step>/`
  - `client-result.json` / `request-to-server.json` / `server-response.json` / `server-promise.json`
- **Server / proxy logs:** `a2a-server/logs/`, `a2a-client/logs/`, `ai-integration/proxy_logs/promises/<id>/`
- **promiseId / request id:**
- **Hypothesis:**
- **Commands run:** (e.g. `npm run sim:validate -- --all`, `scan-session-responses`, unit path)
- **Resolution:** (when done: root cause + PR/commit ref; then remove from Active table)
```

---

## Quick probes (no stack required where noted)

| Check | Command or path |
|-------|------------------|
| Schema / shape | [`tests/direct-tests/README.md`](tests/direct-tests/README.md), [`tests/direct-tests/validators/README.md`](tests/direct-tests/validators/README.md) |
| Sims | `npm run sim:lint -- --all` / `npm run sim:validate -- --all` (from repo root) |
| Gray room snapshot | `npm run verify:gray-room -- <snapshot.json>` |
| Full client+server+sim sweep | `npm run test:gang` (see [`PAPA-MAMA.md`](PAPA-MAMA.md)) |

---

## Seed example (delete when real incidents exist)

The following is **illustrative** only — remove this subsection once you have real entries.

- **Example session:** `sess_1775427112940` step `2` — inspect `server-response.json` for unexpected `execute.form` (e.g. router choices) vs expected agent continuation.

---

*Last updated: 2026-04-06*
