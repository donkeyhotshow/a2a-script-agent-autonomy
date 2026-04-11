# Human-review test suite — consolidated findings

**Purpose:** Exploratory tests under `tests/human-review/` in `a2a-client`, `a2a-server`, and `a2a-ai-hub`. They are **excluded** from normal `npm test` / default pytest (see each module’s config). They encode **desired invariants**; **failing** rows are gaps to fix or expectations to reject after human review.

**Regenerate machine output (overwrites per-module `REPORT.md`):**

- `a2a-client/`: `npm run test:human-review`
- `a2a-server/`: `npm run test:human-review`
- `a2a-ai-hub/`: `python scripts/run-human-review.py`
- All three: `npm run test:human-review:all` (repo root)

**Snapshot (2026-04-06):** 20 tests total — **20 passed** (checklist items implemented in code).

---

## Summary by module

| Module           | Passed | Failed | Notes                                      |
|-----------------|--------|--------|--------------------------------------------|
| **a2a-client**  | 8      | 0      | Client API DTOs, envelope, stage, submit |
| **a2a-server**  | 8      | 0      | Normalization, gray-room merge, validation |
| **a2a-ai-hub** | 4   | 0      | `_extract_prompt`, `_normalize_path` / path match |

---

## a2a-client (`a2a-client/tests/human-review/`)

| File | Status | Finding (if failed) |
|------|--------|------------------------|
| `next-response-top-execute.test.mjs` | **PASS** | `toPublicNextResponse` prefers projected `session.execute` when present. |
| `parse-invoke-promiseid-precedence.test.mjs` | **PASS** | `parseA2aInvokeResponse` prefers `data.promiseId` over top-level when both are strings. |
| `pick-invoke-workbench-null.test.mjs` | **PASS** | `pickInvokeContextPatch` omits `workbench` when upstream sends `null`. |
| `promise-poll-failed-terminal.test.mjs` | **PASS** | `normalizePromisePollStatus({ status: 'failed' })` is terminal (`failed`, not `asyncPending`). |
| `router-submit-numeric-task.test.mjs` | **PASS** | `buildSubmitResult` coerces numeric `task` to string `message` / `choice`. |
| `stage-processing-status.test.mjs` | **PASS** | `deriveSessionStage` maps `pending` / `processing` / `waiting` to `awaiting-async` before final `dialog-input`. |
| `unwrap-envelope-data-null.test.mjs` | **PASS** | `unwrapEnvelope` falls back to **`session`** when **`data` is `null`**. |
| `web-execute-unknown-tool-key.test.mjs` | **PASS** | `buildWebExecute` allowlists `form` / `message` / `attachments` only. |

**Implementation touchpoints (for fixes):** `session-projection-dto.js` (`toPublicNextResponse`), `client-api-envelope.mjs` (`parseA2aInvokeResponse`, `unwrapEnvelope`), `context-invoke-patch.mjs`, `router-submit.mjs`, `session-stage-machine.js` / `session-stage-derive.mjs`, `web-execute-dto.mjs`.

---

## a2a-server (`a2a-server/tests/human-review/`)

| File | Status | Finding (if failed) |
|------|--------|------------------------|
| `deep-clone-json-undefined.test.ts` | **PASS** | Documents JSON clone dropping `undefined` (expected `JSON.stringify` behavior). |
| `humanize-upstream-infra-leak.test.ts` | **PASS** | Local LLM upstream / `127.0.0.1:*` / `localhost:*` patterns → `CLIENT_SAFE_PROCESSING_ERROR`. |
| `invoke-shape-null-context.test.ts` | **PASS** | `toInvokeShapeForPromptsTransform` only treats non-null object `context` as nested envelope; `context: null` is folded into flat shape. |
| `merge-inner-history-invariant.test.ts` | **PASS** | Non-array `history` from handler does not replace a valid array from prior inner context. |
| `resolve-execution-empty-root.test.ts` | **PASS** | Root `execution: {}` is ignored; nested `context.execution` is used. |
| `resolve-result-array-nested.test.ts` | **PASS** | `resolveResultObject` ignores array `context.result` and keeps root `result`. |
| `try-parse-json-trailing-garbage.test.ts` | **PASS** | `tryParseJsonFromLlmText` parses leading JSON before trailing prose. |
| `validate-context-execution-shape.test.ts` | **PASS** | `validateContextBlock` rejects non-object `execution` (including arrays). |

**Implementation touchpoints:** `normalization.ts`, `gray-room-utils.ts`, `context-parser.ts`, `request.service.ts` (`humanizeUpstreamErrorMessage`), `strip-markdown-json-fence.ts`.

---

## a2a-ai-hub (`a2a-ai-hub/tests/human-review/`)

| File | Status | Finding (if failed) |
|------|--------|------------------------|
| `test_extract_prompt_multimodal.py` | **PASS** | `_message_content_to_text` flattens list segments (`text` / nested `content`). |
| `test_extract_prompt_numeric_content.py` | **PASS** | Numeric `content` stringified. |
| `test_extract_prompt_tool_calls.py` | **PASS** | `tool_calls` JSON appended when useful for rules. |
| `test_match_when_path_trailing_slash.py` | **PASS** | `_normalize_path` strips leading and trailing slashes. |

**Implementation touchpoints:** `proxy/ai_hub_config.py` (`_extract_prompt`, `_normalize_path`, `_match_when`).

---

## Human confirmation checklist

**Status (2026-04-06):** decisions below are implemented in the codebase.

- [x] **Client:** top `execute` vs projected session on `/next` — **Win: projected / web-safe `session.execute`** (after `buildWebExecute` / public session shaping). Raw top-level `execute` must not override: web DTO stays form-facing, no tool payload leakage (AGENTS.md).
- [x] **Client:** `promiseId` precedence (root vs `data`) — **Prefer `data.promiseId` when both exist** (canonical server envelope for polling); root-first breaks if transport and body disagree.
- [x] **Client:** `status: processing` — **Map to `awaiting-async`** when nothing else defines another stage (even if `asyncPending` is false), so the UI is not stuck on `dialog-input` while the hub works; **`GET /async` remains authoritative** for completion.
- [x] **Client:** `unwrapEnvelope` — `data: null` falls back to `session` when present.
- [x] **Client:** `buildWebExecute` — **Allowlist web-safe keys** (not only stripping known internal tool keys), so new server actions cannot leak by default.
- [x] **Server:** `context: null` before prompts transform — **Normalize:** do not treat `'context' in ctx` with `context: null` as a nested envelope; transforms must not see `null` inner context from that shape.
- [x] **Server:** gray-room merge — **Coerce or reject** non-array `history`; never overwrite a valid array with a string or other type.
- [x] **Server:** `resolveExecution` — **Treat root `{}` as missing** and fall back to nested `context.execution` so nested action is visible.
- [x] **Server:** `validateContextBlock` — **Reject `execution` as array**; malformed contexts must fail validation.
- [x] **Server:** `humanizeUpstreamErrorMessage` — **Scrub Local LLM upstream / host / port patterns**; user-visible copy stays product-safe.
- [x] **AI hub:** `_extract_prompt` — **Extend** for list multimodal segments, numeric `content`, and assistant rows with `tool_calls` but empty `content`.
- [x] **AI hub:** `_match_when` path — **Normalize trailing slash** in comparison (e.g. `/api/chat` ≡ `/api/chat/`) so rules are robust; document if any exception is required.

---

## Related docs

- Per-run logs: `a2a-client/tests/human-review/REPORT.md`, `a2a-server/tests/human-review/REPORT.md`, `a2a-ai-hub/tests/human-review/REPORT.md`
- Operator flow: [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md)
- Agent-mode Client API dialog (maintained state + changelog): [`docs/AGENT-DIALOG-API-STATE.md`](AGENT-DIALOG-API-STATE.md)
