# Client API: `/async` resolves pending work

## Sources

- [`a2a-client/docs/api-testing-plan.md`](../a2a-client/docs/api-testing-plan.md) — §3 + checklist item 3

## Agent prompt (copy)

When `asyncPending=true`, poll `GET /api/a2a/sessions/{id}/async` until terminal; then hydrate `GET …/sessions/{id}`. Log promise/session ids if stuck.

## Completion

[X] Completed
