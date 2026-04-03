# Trace source of wrong-path bug artifacts (DONE 2026-04-03)

## Root cause (by symptom)

| Symptom | Cause | Fix |
|---------|--------|-----|
| `a2a-client/a2a-client/logs/`, `a2a-server/a2a-server/logs/` | `scripts\start-*.bat` used relative paths (`a2a-client`, `start /d a2a-client`) while **current working directory** was already inside that package (or not repo root). | `cd /d "%~dp0.."` at start of each `scripts\start-*.bat`; `cd /d "%~dp0"` in `start-all.bat` and `kill-all.bat`. |
| `proxy_logs/request_*` at storage root (not under `requests/`) | `proxy_handler.handle_proxy_request` joined `STORAGE_DIR` + folder directly; `request_processor._prepare_logging` already used `requests/`. | `proxy_handler.py`: `os.path.join(STORAGE_DIR, "requests", folder_name)`. |
| Root `request.md`, `4)`, `nul`, `debug.log` | Editor/sim one-offs, accidental filename, Windows NUL reserved name misuse elsewhere, or local debug — **not** changed in code here. `promises._load_request_snapshot` already migrates old paths. | Operators: keep sim output under `simulations/`; avoid creating files named `nul` on Windows. |

## Migration

- Existing `ai-integration/proxy_logs/request_*` (top-level): optional one-time move into `proxy_logs/requests/`; cleanup still removes legacy dirs by TTL.

## Verification

- Run `start-all.bat` from any cwd: logs under `a2a-client/logs/web-ui.log`, `a2a-server/logs/server.log`.
- New proxy traffic: folders only under `proxy_logs/requests/request_*`.
