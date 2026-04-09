# Distill: Task Monitor documentation surfaces

## Artifacts

- [`MONITOR-QUICK-START.md`](../../MONITOR-QUICK-START.md) — operator entry (monitor + Client API).
- [`prompts-to-agent-mode/task-monitor-quick-start.md`](../../prompts-to-agent-mode/task-monitor-quick-start.md) — **agent prompt** to refresh docs; **`COMPLETION-REPORT.md`** references removed (2026-04-08).
- [`tests/monitor-and-process-tasks.js`](../../tests/monitor-and-process-tasks.js) — source of truth for behavior.

## Why (Brown)

Multiple names (`MONITOR-QUICK-START` vs `task-monitor-quick-start`) still invite drift; **`COMPLETION-REPORT.md`** references were removed from `task-monitor-quick-start.md`, `MONITOR-QUICK-START.md`, and `DEV_STATE.md` (2026-04-08).

## Actions

1. **Pick one** operator-facing doc: keep `MONITOR-QUICK-START.md` **or** merge into `prompts-to-agent-mode/README.md` / `STACK-RUN.md` with a single anchor from root `README.md`.
2. **Rename or cross-link** the prompts file so “quick start” is not three different things.
3. **Optional:** add root `COMPLETION-REPORT.md` only if you want a separate index; otherwise keep operator narrative in `MONITOR-QUICK-START.md` + `DEV_STATE.md` (current default).

## Done when

One clear primary doc for monitor operators; no dangling `COMPLETION-REPORT` references; prompts file describes its role (meta vs operator).
