# ADR-0035: open follow-ups (UI + session metadata)

## Sources

- [`docs/adr/ADR-0035-agentic-reasoning-safety-layer.md`](../../docs/adr/ADR-0035-agentic-reasoning-safety-layer.md) — table rows **⏳ Нужно** (~lines 509–510): `WAITING_STATE` UI modal; `conversation_id` in session metadata for `INTEGRITY_CHECK`
- [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../../a2a-client/docs/WEB_UI_PROTOCOL.md)

## Agent prompt (copy)

Implement or explicitly defer each ⏳ row: client modal behavior for waiting/approval states; session/create or persistence path for `conversation_id` if still required. Update ADR-0035 table (✅/deferred) and `DEV_STATE` for touched modules.

## Completion

[X] Completed
