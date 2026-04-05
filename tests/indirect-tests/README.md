# Indirect tests (Мама)

**Purpose:** deterministic checks **without** a live stack — static analysis, file scans, schema validation, unit tests.

**Normative methodology:** [PAPA-MAMA.md](../../PAPA-MAMA.md) at repo root.

---

## Quick Start

```bash
# Run all indirect tests (npm wrapper)
npm run test:indirect

# Run all indirect tests (direct)
node tests/indirect-tests/run-all.mjs
node tests/indirect-tests/run-all.mjs --json

# Run server unit tests (no Ollama required)
npm run test:server:unit
# Or with filter
powershell -File tests/indirect-tests/run-server-unit-tests.ps1 -Filter "router"

# Run all "before start" checks
npm run test:before-start
```

### Individual validators
```bash
node tests/indirect-tests/validate-action-registry.mjs
node tests/indirect-tests/validate-request-schemas.mjs
node tests/indirect-tests/validate-import-extensions.mjs
node tests/indirect-tests/validate-prompts.mjs
```

---

## Test Inventory

| Script | What it checks | Fail indicates |
|--------|----------------|----------------|
| `validate-action-registry.mjs` | Action folders have handler.ts, schema.ts, index.ts exports | Registry out of sync with code |
| `validate-request-schemas.mjs` | JSON schemas in docs/new-request-flow/ are valid JSON | Schema drift, broken validation |
| `validate-import-extensions.mjs` | Relative imports use `.js` (NodeNext requirement) | Runtime import errors |
| `validate-prompts.mjs` | Prompt markdown files have balanced braces, consistent structure | Template rendering errors |
| `run-server-unit-tests.ps1` | a2a-server Vitest suite (mocked LLM) | Logic bugs in processors, transforms |
| [`red-room/validate-red-room-dialog-vertical.mjs`](red-room/validate-red-room-dialog-vertical.mjs) | **Mama red:** vertical dialog flow vs spec | Wrong step shape / order in captures |
| [`gray-room/validate-gray-room-horizontal.mjs`](gray-room/validate-gray-room-horizontal.mjs) | **Mama gray:** `interruptTrace` handler order | Gray-room pipeline drift |
| [`validators/audit-sticky-router.mjs`](validators/audit-sticky-router.mjs) | Saved sessions: sticky router / action jump | Session replay contract drift |
| [`validators/audit-execute-shape-simulations.mjs`](validators/audit-execute-shape-simulations.mjs) | All `simulations/sync/**/response.json` (incl. `N-sub-M` steps) | Multi-key execute, legacy result blobs |

See [PAPA-MAMA.md](../../PAPA-MAMA.md) (Red vs Gray) and per-folder READMEs in `red-room/`, `gray-room/`.

---

## When to use

### Before starting the stack
1. `node tests/indirect-tests/run-all.mjs` — fast static checks
2. `.\tests\indirect-tests\run-server-unit-tests.ps1` — server logic

If these pass, the stack has a better chance of starting clean.

### When direct tests fail
If `e2e-dialog-test.js` or session flows fail:
1. Check server unit tests first — processor bugs often surface there
2. Run `validate-request-schemas.mjs` — shape may have drifted
3. Check `validate-import-extensions.mjs` — NodeNext import issues break runtime

### CI / pre-commit
These tests are designed for CI pipelines where starting Ollama + AI proxy + full stack is expensive or impossible.

---

## Coverage Gaps (intentional)

Indirect tests **do not** cover:
- LLM response quality (requires live Ollama)
- End-to-end session flows (requires Client API)
- Async promise handling (requires full stack)

Those belong in [tests/direct-tests/](../direct-tests/) (Papa layer).

---

## Failure class matrix (Papa vs Mama)

| Failure Class | Papa (live stack) | Mama (offline) |
|--------------|-------------------|----------------|
| Sticky router | `e2e-dialog-test.js --only=router*` | Session replay from disk |
| Wrong beat (message vs choice) | Client API `/next` with form | Request schema validation |
| Execute single-key shape | Real invoke, proxy body scan | `scan-session-responses`, simulations |
| Async stuck/processing | Poll `/async`, hub health | N/A (requires live) |
| Gray room sequence | Agent mode E2E | `interruptTrace` snapshot validation |
| Schema/MD drift | N/A | `sim:check-md` |
| Import extensions (NodeNext) | N/A | `validate-import-extensions` |
| Router descriptions | N/A | `audit:sim-choice-descriptions` |

See [`PAPA-MAMA.md`](../../PAPA-MAMA.md) for methodology.

## Future migration

Today, validators still live under `tests/direct-tests/validators/`. Over time, schema-only validators (that don't read `storage/sessions/` or `a2a-server/storage/requests/`) may move here to clarify intent: **Mama = offline**, **Papa = online**.
