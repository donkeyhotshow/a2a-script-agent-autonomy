# T025 — `action-validator.ts` execute types = `sim-lint` + real LLM output

**Golden:** [`a2a-server/scripts/sim-lint.ts`](../a2a-server/scripts/sim-lint.ts) `VALID_EXECUTE_TYPES` includes `rag-search`, `list-directory`, `message`, …

**Code:** [`a2a-server/src/actions/action-validator.ts`](../a2a-server/src/actions/action-validator.ts) — `ExecutePayloadSchema` **omits** `rag-search` and `list-directory`; `validExecuteKeys` (lines 173–174, 194) omits them too.

**Goal:** `validateExecutePayloadDetailed` / `validateActionResponse` accept the same tool keys the protocol and linters allow, or validators are explicitly scoped to “simulation mode subset” with a comment.

**Acceptance:**
- Add Zod branches + keys for `rag-search` and `list-directory` (minimal shapes).
- Unit test: payload `{ "execute": { "rag-search": { "query": "x" } } }` validates successfully.
