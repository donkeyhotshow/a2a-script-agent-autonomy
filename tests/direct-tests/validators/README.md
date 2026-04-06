# Validators

**Purpose:** Standalone lint/check scripts for payloads, logs, and simulation JSON (not Vitest tests). They are **high-signal**: each run **prints specific contract problems** (wrong `message` placement, missing fields, drift between files) so you can fix the shape before chasing failures in the full stack.

**Why use them:** Faster than stepping through the UI; same rules as shared helpers where noted (e.g. [`lib/check-llm-execute-shape.mjs`](lib/check-llm-execute-shape.mjs) for assistant-line vs tool keys).

**Quickstart:** From repo root, see root `package.json` scripts: `scan-promise-bodies`, `scan-session-responses`, `verify:gray-room`, `audit:sim-choice-descriptions`, `sim:check-md`.

## Scripts in this folder

| Script | npm run | What it checks |
|--------|---------|----------------|
| [lib/check-llm-execute-shape.mjs](lib/check-llm-execute-shape.mjs) | — | Shared rules used by `scan-promise-bodies` and `scan-session-responses` |
| [scan-promise-bodies.mjs](scan-promise-bodies.mjs) | `scan-promise-bodies` | `ai-integration/proxy_logs/promises/*/body.md` — LLM JSON (e.g. top-level `message` + tool vs `execute.message`) |
| [scan-session-responses.mjs](scan-session-responses.mjs) | `scan-session-responses` | `a2a-client/storage/sessions/**/server-response.json` — execute/message rules + `context.task` + non-empty `history` must include `role:user` (see `simulations/sync/dialog/description.md`) |
| [verify-gray-room-state.mjs](verify-gray-room-state.mjs) | `verify:gray-room` | Session/context snapshot JSON — `workbench.sections.sequence`, predictions, `history` / `operationHistory` consistency |
| [audit-sim-choice-descriptions.mjs](audit-sim-choice-descriptions.mjs) | `audit:sim-choice-descriptions` | All `simulations/**/*.json` — router `choices[]` rows must have non-empty `description` |

## Related (stay in package modules)

| Location | Role |
|----------|------|
| `npm run sim:lint` / `sim:validate` | Golden simulation pipeline (`a2a-server`) |
| `npm run sim:check-md` / `sim:check-md:fix` | Delegates to a2a-server — `request.md` / `response.md` fenced JSON vs sibling `*.json` |
| `scripts/gen-sim-md-mirrors.mjs` | Regenerate `*.md` mirrors from JSON |

