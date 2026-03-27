# S-04: Server LLM Hub Polling

## Status
- [x] Done

## Description
Standardize `LLM_POLL_*`/`POLL_*` defaults and timeout budget for daemon processing.

## Details
- Стандартизировать LLM_POLL_*/POLL_* defaults
- Определить timeout budget для daemon processing
- Документировать поведение

## Source
- [a2a-server/DEV_STATE.md:172](../a2a-server/DEV_STATE.md)

## Owner
a2a-server polling

## Verification
- Defaults стандартизированы (`POLL_INTERVAL_MS`, `POLL_TIMEOUT_MS`, `LLM_POLL_INTERVAL_MS`, `LLM_POLL_TIMEOUT_MS`)
- Timeout budget определён (1h default, capped 24h, aligned with ai-integration `PROMISE_TTL_SECONDS`)
- Daemon работает корректно (poller respects env defaults and caps)