# System errors — one folder

Canonical index of **failure classes** this repo knows about: where they come from, what they mean, and what to run next.

| Doc | Contents |
|-----|----------|
| [monitor-classifier.md](monitor-classifier.md) | Task Monitor / Client API **regex classifier** (`type:subtype`, hints, severity) — [`tests/monitor-tasks/errors.js`](../../tests/monitor-tasks/errors.js) |
| [transform-and-shape-codes.md](transform-and-shape-codes.md) | **Server** `TransformExecuteValidationIssue` codes — [`transform-execute-validator.ts`](../../a2a-server/src/services/core/request-processor/validators/transform-execute-validator.ts) |
| [llm-execute-shape-codes.md](llm-execute-shape-codes.md) | **Offline** LLM JSON / session scan codes — [`check-llm-execute-shape.mjs`](../../tests/direct-tests/validators/lib/check-llm-execute-shape.mjs) |
| [validators-and-gates.md](validators-and-gates.md) | npm scripts that **surface** errors before prod (indirect tests, sims, gang) |

**Maintenance:** When you add a new `code:` in the transform validator, a new classifier row, or a new validator script, update the matching file here. Glossary: [GLOSSARY.md](../../GLOSSARY.md). Operator flow: [AGENTS.md](../../AGENTS.md), [PAPA-MAMA.md](../../PAPA-MAMA.md).
