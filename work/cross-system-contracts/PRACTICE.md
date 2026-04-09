# Practical experience — `cross-system:validate`

**Purpose:** Operator notes from actually running the bundle script, not theory. Complements [`SEQUENCE.md`](SEQUENCE.md).

## Command

From repository root:

```bash
npm run cross-system:validate
```

**Shell:** On Windows PowerShell use `Set-Location <repo>` (not `cd /d`). The script only needs Node + npm; no live stack required if the optional folders are empty (steps are skipped).

**One `promiseId` (not the bundle):** `npm run report:promise -- <promiseId> --out trace.md` — Markdown join of server storage, hub `proxy_logs`, client session refs, Gray Room fields — [`scripts/promise-artifacts-report.mjs`](../scripts/promise-artifacts-report.mjs).

## What runs (four blocks)

| Block | Under the hood | Typical outcome |
|-------|----------------|-----------------|
| 1 | `scan-promise-bodies` | Reads `ai-integration/proxy_logs/promises/*/body.md`. **SKIP** if `promises/` is missing. |
| 2 | `scan-session-responses` | Reads all `a2a-client/storage/sessions/**/server-response.json`. **SKIP** if `sessions/` is missing. |
| 3 | `verify-gray-room-state` on one JSON file | **SKIP** unless at least one `server-response.json` contains `context.workbench.sections.sequence` with real steps (array or `{ steps: [...] }`). If multiple qualify, the **newest by mtime** is used. |
| 4 | `audit-sim-choice-descriptions` | Always runs (simulations tree). |

## Observed behavior (real runs)

- **Exit code `0`:** All executed steps passed. Skips do **not** count as failure.
- **Exit code non-zero:** At least one executed validator reported issues (read the block headers in the log — `=== cross-system:validate (N/4) ===`).
- **Session-heavy workspace:** With dozens of `server-response.json` files, step 2 can take on the order of **10–20 seconds** on a laptop; step 4 is usually quick.
- **Agent / router turns without sequence:** Many live `server-response.json` files have **no** `workbench.sections.sequence`. Step 3 is **often SKIP** in that situation. That is **not** a failure — it means there was nothing for gray-room offline checks to verify. To force step 3, drive a session that fills the sequence queue, then re-run.
- **Design note:** Step 3 deliberately does **not** pick the “latest file overall” if that file lacks `sequence`. Using the latest arbitrary snapshot used to make `verify-gray-room-state` exit with `no sequence (optional): nothing to verify` and fail the whole bundle; filtering to “newest file that has sequence” avoids that false negative.

## When the bundle fails for real

1. **Promise bodies:** Fix or isolate LLM JSON shape issues in the listed `body.md` paths; re-run.
2. **Session responses:** Same for `server-response.json` paths and codes (`history-no-user`, execute/message rules, etc.).
3. **Gray-room:** Issues refer to the **single file** printed as `Using: ...` — open that snapshot and align workbench/history/operationHistory.
4. **Sim choices:** Add or fix `description` on router `choices[]` rows in the reported simulation JSON files.

## After a confirmed bug

1. Copy evidence to `scratch/` if you might run `cleanup-session-state.js`.
2. Add a row to [`tasks/pending/cross-system-parameter-hunt.md`](../tasks/pending/cross-system-parameter-hunt.md).
3. Optional: `npm run cross-system:new-fixture -- <slug>`, then edit `meta.json` and add `excerpt.*`.

## Related

- [`README.md`](README.md) — hub index  
- [`SEQUENCE.md`](SEQUENCE.md) — full procedure  
- [`tests/direct-tests/validators/README.md`](../tests/direct-tests/validators/README.md) — per-validator details  
