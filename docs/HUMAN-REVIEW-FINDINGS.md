# Human-review test suite — consolidated findings

**Purpose:** Exploratory tests under `tests/human-review/` in `a2a-client`, `a2a-server`, and `ai-integration`. They are **excluded** from normal `npm test` / default pytest (see each module’s config). They encode **desired invariants**; **failing** rows are gaps to fix or expectations to reject after human review.

**Regenerate machine output (overwrites per-module `REPORT.md`):**

- `a2a-client/`: `npm run test:human-review`
- `a2a-server/`: `npm run test:human-review`
- `ai-integration/`: `python scripts/run-human-review.py`
- All three: `npm run test:human-review:all` (repo root)

**Snapshot (2026-04-06):** 20 tests total — **4 passed**, **16 failed**.

---

## Summary by module

| Module           | Passed | Failed | Notes                                      |
|-----------------|--------|--------|--------------------------------------------|
| **a2a-client**  | 1      | 7      | Client API DTOs, envelope, stage, submit |
| **a2a-server**  | 3      | 5      | Normalization, gray-room merge, validation |
| **ai-integration** | 0   | 4      | `_extract_prompt`, `_match_when` paths    |

---

## a2a-client (`a2a-client/tests/human-review/`)

| File | Status | Finding (if failed) |
|------|--------|------------------------|
| `next-response-top-execute.test.mjs` | **FAIL** | `toPublicNextResponse` prefers **top-level** `execute` over **projected** `session.execute`, so raw tool keys (e.g. `read-file`) can reach the browser. **Risk:** leaks paths / tool payloads to the web DTO. |
| `parse-invoke-promiseid-precedence.test.mjs` | **FAIL** | `parseA2aInvokeResponse` returns **top-level** `promiseId` before `data.promiseId`. If both exist, **server** id in `data` is ignored — may desync async polling vs server truth. |
| `pick-invoke-workbench-null.test.mjs` | **FAIL** | `pickInvokeContextPatch` copies `workbench: null` (`!== undefined`), so clients may **clear** workbench explicitly with `null` instead of “omit field”. |
| `promise-poll-failed-terminal.test.mjs` | **PASS** | `normalizePromisePollStatus({ status: 'failed' })` is terminal (`failed`, not `asyncPending`). |
| `router-submit-numeric-task.test.mjs` | **FAIL** | `buildSubmitResult` puts **number** `task` into `message`; `validateClientResultPayload` expects a **string**. Shorthand JSON numeric `task` breaks `/next` validation. |
| `stage-processing-status.test.mjs` | **FAIL** | `deriveSessionStage` does not treat `status: 'processing'` as **`awaiting-async`**; falls through to **`dialog-input`**. UI may show the wrong coarse stage while work is in flight. |
| `unwrap-envelope-data-null.test.mjs` | **FAIL** | `unwrapEnvelope` returns `data` when `data !== undefined`, so **`data: null`** yields `null` and **ignores** `session`. Partial envelopes can drop the usable payload. |
| `web-execute-unknown-tool-key.test.mjs` | **FAIL** | `buildWebExecute` only strips known internal keys; **arbitrary** execute keys remain on the projected object — weak enforcement of single-action / web-safe surface. |

**Implementation touchpoints (for fixes):** `session-projection-dto.js` (`toPublicNextResponse`), `client-api-envelope.mjs` (`parseA2aInvokeResponse`, `unwrapEnvelope`), `context-invoke-patch.mjs`, `router-submit.mjs`, `session-stage-machine.js` / `session-stage-derive.mjs`, `web-execute-dto.mjs`.

---

## a2a-server (`a2a-server/tests/human-review/`)

| File | Status | Finding (if failed) |
|------|--------|------------------------|
| `deep-clone-json-undefined.test.ts` | **PASS** | Documents JSON clone dropping `undefined` (expected `JSON.stringify` behavior). |
| `humanize-upstream-infra-leak.test.ts` | **FAIL** | `humanizeUpstreamErrorMessage` passes through strings that name **Ollama / ports**; product rule is client-safe copy without infra leakage. |
| `invoke-shape-null-context.test.ts` | **FAIL** | `toInvokeShapeForPromptsTransform` treats `'context' in ctx` as nested envelope even when **`context: null`**, returning `null` inner context to transforms. |
| `merge-inner-history-invariant.test.ts` | **FAIL** | `mergeGrayRoomFinalizeInnerContext` spreads `nextInner` so a **non-array** `history` (e.g. string) can **overwrite** a valid array. |
| `resolve-execution-empty-root.test.ts` | **FAIL** | `resolveExecution` returns **root** `{}` and never falls back to **`context.execution`** when root is an empty object — nested action is invisible. |
| `resolve-result-array-nested.test.ts` | **PASS** | `resolveResultObject` ignores array `context.result` and keeps root `result`. |
| `try-parse-json-trailing-garbage.test.ts` | **PASS** | `tryParseJsonFromLlmText` parses leading JSON before trailing prose. |
| `validate-context-execution-shape.test.ts` | **FAIL** | `validateContextBlock` does **not** reject **`execution` as an array**; malformed contexts can pass validation. |

**Implementation touchpoints:** `normalization.ts`, `gray-room-utils.ts`, `context-parser.ts`, `request.service.ts` (`humanizeUpstreamErrorMessage`), `strip-markdown-json-fence.ts`.

---

## ai-integration (`ai-integration/tests/human-review/`)

| File | Status | Finding (if failed) |
|------|--------|------------------------|
| `test_extract_prompt_multimodal.py` | **FAIL** | `_extract_prompt` only appends `content` when it is a **string**; **list** multimodal segments (e.g. `{type,text}`) produce **empty** prompt — rules / logging miss user text. |
| `test_extract_prompt_numeric_content.py` | **FAIL** | Numeric `content` is skipped; prompt stays empty. |
| `test_extract_prompt_tool_calls.py` | **FAIL** | Assistant rows with **`tool_calls`** and empty `content` contribute **nothing**; tool metadata not visible to prompt-based rules. |
| `test_match_when_path_trailing_slash.py` | **FAIL** | `_match_when` **exact** `path` match after `_normalize_path` does not treat `/api/chat` and `/api/chat/` as equivalent — fragile rule matching. |

**Implementation touchpoints:** `proxy/ai_hub_config.py` (`_extract_prompt`, `_normalize_path`, `_match_when`).

---

## Human confirmation checklist

Use this after you decide each row is a **real bug** vs **wrong test expectation**:

- [ ] **Client:** top `execute` vs projected session — which source should win on `/next` responses?
- [ ] **Client:** `promiseId` precedence (root vs `data`) — match production invoke envelopes.
- [ ] **Client:** `status: processing` — should map to `awaiting-async` without `asyncPending`?
- [ ] **Client:** `unwrapEnvelope` — should `data: null` fall back to `session`?
- [ ] **Client:** `buildWebExecute` — strip all non-allowlisted keys or only internal tool keys?
- [ ] **Server:** normalize `context: null` before prompts transform.
- [ ] **Server:** gray-room merge — coerce or reject non-array `history`.
- [ ] **Server:** `resolveExecution` — treat `{}` as missing and use nested `execution`.
- [ ] **Server:** validate `execution` type in `validateContextBlock`.
- [ ] **Server:** extend `humanizeUpstreamErrorMessage` for Ollama / port patterns.
- [ ] **AI hub:** extend `_extract_prompt` for list content, numbers, and `tool_calls`.
- [ ] **AI hub:** normalize trailing slash (or document rule authors must use `path_prefix`).

---

## Related docs

- Per-run logs: `a2a-client/tests/human-review/REPORT.md`, `a2a-server/tests/human-review/REPORT.md`, `ai-integration/tests/human-review/REPORT.md`
- Operator flow: [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md)
- Agent-mode Client API dialog (maintained state + changelog): [`docs/AGENT-DIALOG-API-STATE.md`](AGENT-DIALOG-API-STATE.md)
