# IDE / pre-stack prompts

Copy-paste prompts for **Cursor, docs, sims, methodology, and module plans**. They assume **repo + tooling**, not a running Client API session.

**Contrast:** [`prompts-to-agent-mode/README.md`](../../prompts-to-agent-mode/README.md) holds the **flat** queue consumed by `monitor-and-process-tasks.js` (`TASK_MONITOR_TASKS_DIR` default) — tasks meant to run **through** the script-agent stack after it is up.

**Order:** Prefer finishing or advancing relevant work in **`tasks/`** and this folder **before** running the session queue / Task Monitor; see [`tasks/README.md`](../README.md) (*Self-Upgrade order*).

## Index (one file per topic)

| Area | Files |
|------|--------|
| Methodology | `methodology-task-organize-dialog-test.md`, `methodology-task-export-debug-state.md`, `methodology-improvements-automation.md`, `methodology-adr-compliance-orchestrator.md`, `methodology-proposals-folder-missing.md` |
| Scripts / tests | `scripts-tests-hierarchical-suite.md` |
| Simulations | `sim-async-expand-coverage.md`, `sim-sync-agent-coder-smart-description-stubs.md`, `sim-sync-task-decomposition-description-stubs.md` |
| Greedy-dump | `greedy-dump-integration-and-slices.md`, `greedy-dump-task-tree-open-nodes.md` |
| Docs / PROTOCOL / ADR | `doc-*.md` (this folder) |
| Repo layout | `repo-tasks-pending-archive-layout.md`, `repo-task-specs-missing-restore.md` |
| ai-integration plans | `ai-integration-*-plan.md` |
