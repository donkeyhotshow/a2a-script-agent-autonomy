# Router Fallback Simulation

## Description
Tests the router fallback behavior when a task string does not match any keyword in the
action registry. When `routerConfig.autoSelectionEnabled` is false (default) and no
keyword match is found, the server must return the full static choices list without
auto-selecting.

## Contract: No keyword match → explicit choices list, no autoSelection

### Scenario 1 — Task with no keyword match

**Input task:** `"zxywqmnop_unmatched_keyword_12345"` (deliberately unrecognized)

**Expected:**
- `execute.form.choices` contains at least 3 entries: `dialog`, `agent`, `task-decomposition`
- No `execution.action` pre-selected in the returned context
- `execution.step` should be `"router"`
- No `execute.message` — user must explicitly pick a choice

### Why this matters

Without this test:
- A regression could cause the router to silently auto-select `dialog` (the first static choice),
  bypassing the user's intent to pick `agent` or a specific scripted action.
- The `autoSelectionEnabled` flag would have no observable contract.

### Static choices (canonical IDs from `shared/router-static-choices.json`)

| id | label |
|----|-------|
| `dialog` | AI Dialog |
| `agent` | Agent Mode |
| `task-decomposition` | Task Decomposition |
