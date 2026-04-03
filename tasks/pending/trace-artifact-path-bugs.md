# Trace source of wrong-path bug artifacts (logs, root junk, proxy_logs)

## Problem

Unwanted files appear in the wrong places. Find what creates or configures these paths so logs and request dumps land under canonical locations and repo root stays clean.

## Observed wrong locations

| What | Wrong path | Expected |
|------|------------|----------|
| Junk / accidentals | Repo root: `4)`, `request.md`, `nul`, `debug.log` | Not at root (or under `work/` / ignored temp per project rules) |
| Web UI log | `a2a-client/a2a-client/logs/web-ui.log` | `a2a-client/logs/web-ui.log` |
| Server log | `a2a-server/a2a-server/logs/server.log` | `a2a-server/logs/server.log` |
| AI proxy request dumps | `ai-integration/proxy_logs/request_*` | `ai-integration/proxy_logs/requests/` |

## Investigation

- Grep scripts and env for `a2a-client/a2a-client`, `a2a-server/a2a-server`, `web-ui.log`, `server.log`, `proxy_logs`, `request_`.
- Check `start-all.bat` / `start-all.sh`, npm `cwd`, and any log path resolution that doubles the package folder name.
- For root `request.md`: sim pipeline vs editor vs script (see `simulations/` and direct-tests).
- For `nul`: Windows quirk (`echo … > nul` from wrong directory); find shell/batch that writes to literal `nul` in repo.
- For `4)`: likely accidental filename; confirm not referenced in tooling.

## Verification (after fix)

- Start stack once; confirm only `a2a-client/logs/web-ui.log` and `a2a-server/logs/server.log` (no nested duplicate package dir).
- Trigger proxy logging; files under `ai-integration/proxy_logs/requests/` only.
- `.gitignore` / cleanup: root junk not committed; document canonical paths if needed in module README only when changing behavior.

## Done when

- Root cause documented (which component sets each path).
- Code or config updated so new runs use expected paths; optional one-time migration note for movers of existing files.
