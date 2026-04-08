# Code Duplication: REPO_ROOT Setup

The REPO_ROOT setup code is duplicated across multiple test files.

**Locations:**
- `tests/infrastructure/monitor-and-process-tasks.test.js`: Lines 11-12
- `tests/monitor-tasks/task-monitor-task-input.test.js`: Lines 6-7

**Recommendation:** Extract to a shared utility or constant.