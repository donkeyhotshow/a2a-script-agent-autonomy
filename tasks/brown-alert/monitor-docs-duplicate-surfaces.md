# Distill: Task Monitor documentation surfaces

## Artifacts

- [`MONITOR-QUICK-START.md`](../../MONITOR-QUICK-START.md) — operator entry (monitor + Client API).
- [`prompts-to-agent-mode/task-monitor-quick-start.md`](../../prompts-to-agent-mode/task-monitor-quick-start.md) — **agent prompt** to refresh docs; references **`COMPLETION-REPORT.md`** (missing).
- [`monitor-and-process-tasks.js`](../../monitor-and-process-tasks.js) — source of truth for behavior.

## Why (Brown)

Multiple names (`MONITOR-QUICK-START` vs `task-monitor-quick-start`) and a **missing** `COMPLETION-REPORT.md` create drift and duplicate maintenance.

## Actions

1. **Pick one** operator-facing doc: keep `MONITOR-QUICK-START.md` **or** merge into `prompts-to-agent-mode/README.md` / `STACK-RUN.md` with a single anchor from root `README.md`.
2. **Rename or cross-link** the prompts file so “quick start” is not three different things.
3. **Either** add `COMPLETION-REPORT.md` (stub or real) **or** remove references from `task-monitor-quick-start.md`.

## Done when

One clear primary doc for monitor operators; no dangling `COMPLETION-REPORT` references; prompts file describes its role (meta vs operator).
