# Client API: rebuild matches highest finalized step

## Sources

- [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) — §4 + checklist item 4
- [`AGENTS.md`](../AGENTS.md) — Session Storage Format

## Agent prompt (copy)

After multi-step flow, confirm `GET /api/a2a/sessions/{id}` matches latest finalized step artifacts on disk; no stale `execute`. Fix or file bug with paths.

## Completion

- [ ] Done
