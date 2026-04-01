# Client API: `/next` ack-first

## Sources

- [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) — §2 + checklist item 2
- [`docs/OPERATOR-CURL.md`](../docs/OPERATOR-CURL.md)

## Agent prompt (copy)

Verify `POST /api/a2a/sessions/{id}/next` is ack-first (`accepted`, `step`, `asyncPending`, optional `promiseId`) and not treated as final state. Document run.

## Completion

- [ ] Done
