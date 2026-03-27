# S-03: Server Requests Storage

## Status
- [x] Done

## Description
Define default/override storage path behavior (`REQUESTS_STORAGE_PATH`) and retention/cleanup policy.

## Details
- Storage path behavior:
  - By default, requests are stored under `<cwd>/storage/requests`.
  - When `REQUESTS_STORAGE_PATH` is set, that directory is used as-is (relative to server cwd if not absolute).
- Environment:
  - `REQUESTS_STORAGE_PATH`: base directory for file-based request queue.
  - `REQUESTS_RETENTION_DAYS`: how many days to keep completed/failed/cancelled requests (0 = keep forever, default 7, max 365).
  - `REQUESTS_MAX_FILES`: hard cap on total request files (0 = no cap, default 10000, max 1000000).
- Cleanup policy:
  - On each idle tick of the request processor, the server:
    - Deletes completed/failed/cancelled requests whose `completedAt` is older than `REQUESTS_RETENTION_DAYS`.
    - Then enforces `REQUESTS_MAX_FILES` by keeping the newest requests (by `createdAt`) and deleting the oldest overflow.
  - Cleanup runs against the configured `REQUESTS_STORAGE_PATH` and logs a summary when files are removed.

## Source
- [a2a-server/DEV_STATE.md:171](../a2a-server/DEV_STATE.md)

## Owner
a2a-server storage

## Verification
- Поведение определено
- Policy задокументировано
- Cleanup работает