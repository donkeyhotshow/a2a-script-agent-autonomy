# a2a-client

Client web UI, Vite plugin, and packages (SDK, RAG, types, …).

**Live stack:** Start or restart the full coordinated system from the **repository root** with `.\start-all.bat` (Windows) or `./start-all.sh` (Linux/macOS). Do not use `npm run dev` under `web/`, `packages/*`, or elsewhere in this tree as the primary way to restart the whole stack — that duplicates processes and breaks PID tracking.

**Session disk cleanup:** `npm run cleanup:sessions` runs [`scripts/cleanup-sessions.js`](scripts/cleanup-sessions.js) and deletes **every** folder under `storage/sessions/` (no retention by age). For the same tree from the repo root, use `npm run cleanup:sessions-only`. After a wipe, Task Monitor re-binds **one** Client API session per prompt (`taskSessions`). See [`MONITOR-QUICK-START.md`](../MONITOR-QUICK-START.md).
