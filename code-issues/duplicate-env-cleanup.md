# Code Duplication: Environment Variable Cleanup

The environment variable cleanup code is duplicated between `beforeEach` and `afterEach` blocks.

**Locations:**
- `tests/monitor-tasks/task-monitor-task-input.test.js`: Lines 10-15 (beforeEach), Lines 16-21 (afterEach)

**Recommendation:** Refactor to save/restore previous values or extract the list to a constant array.