# Task: enggineered-prompts → script-agent

**Why:** Centralize prompt assets and any automation that applies them, so agent runs use one registry instead of scattered work-folder copies.

**Server target:** `a2a-server` — optional new action or transform that reads curated prompt bundles from repo or storage; keep action-key shape.

**Steps:** 1) Inventory scripts vs static assets. 2) Subtasks per subfolder (see `subtasks/`). 3) Add simulation when an action is stable.

**Done when:** Each subtask has implement / defer / reject with reason in DOCUMENTS-STATE.
