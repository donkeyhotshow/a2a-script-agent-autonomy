# Repo redundancy & hygiene (excludes Client API / Vite–SDK parity)

**Scope:** Cleanup duplicate surfaces, naming collisions, and stray artifacts. **Out of scope here:** consolidating **`hubPromiseRoutes.js`** vs **`hub-proxy.ts`**, session-route parity, or other Vite↔SDK twins — that stays in [`client-api-dedup-no-proxy-in-dto.md`](client-api-dedup-no-proxy-in-dto.md).

---

## 1. Task Monitor — dead or shadow modules

**Problem:** `tests/monitor-tasks/task-monitor-gate.js`, `task-monitor-monitoring.js`, `task-monitor-main-processing.js`, and `task-monitor-rewind.js` (`TaskMonitorRewind`) duplicate or fork logic that already lives (or should live) in **`task-monitor-processing.js`** / entry mixin in [`monitor-and-process-tasks.js`](../../monitor-and-process-tasks.js). Several are only concatenated for substring checks in [`tests/infrastructure/monitor-and-process-tasks.test.js`](../../tests/infrastructure/monitor-and-process-tasks.test.js).

**Actions:**

- Remove duplicate implementations **or** wire missing behavior (e.g. disk rewind on resume) into the **live** mixin and delete the orphan files.
- **`task-monitor-session-helpers.js`** is only imported by **`task-monitor-main-processing.js`** — fold helpers into the canonical module or delete with the fork.
- Refactor static tests: import real modules / assert behavior instead of **`readMonitorSources()`** blob grep where practical.

**Done when:** `npm run test:monitor` passes; `npm run monitor:once` smoke on one prompt; no unused `tests/monitor-tasks/task-monitor-*.js` left without an explicit comment or test-only stub rationale.

---

## 2. Duplicate `run-human-review.mjs` (server vs client)

**Problem:** [`a2a-server/scripts/run-human-review.mjs`](../../a2a-server/scripts/run-human-review.mjs) and [`a2a-client/scripts/run-human-review.mjs`](../../a2a-client/scripts/run-human-review.mjs) are effectively the same script (Vitest human-review config + REPORT.md).

**Actions:**

- Single implementation under repo **`scripts/`** (or shared `.mjs` required by both packages) with **`cwd`** / package root passed in; **or** document one as canonical and have the other `import`/`spawn` it.
- Keep **`npm run test:human-review`** working in both **`a2a-server`** and **`a2a-client`**.

**Done when:** One source of truth; diff between copies is zero or thin wrapper only.

---

## 3. `session-store` naming collision

**Problem:** Two different concepts share the name **`session-store.js`**:

- [`a2a-client/packages/web/js/session-store.js`](../../a2a-client/packages/web/js/session-store.js) — browser/UI persistence.
- [`a2a-client/packages/vite-plugin/storage/session-store.js`](../../a2a-client/packages/vite-plugin/storage/session-store.js) — disk / Client API storage.

**Actions:** Rename one file (e.g. `session-store-disk.js` / `browser-session-store.js`) **or** add a short **naming map** to [`a2a-client/docs/README.md`](../../a2a-client/docs/README.md) (or module README) so reviews and searches do not confuse layers.

**Done when:** Grep for `session-store` in new contributor docs resolves to the right layer in one hop.

---

## 4. Root `BREAK_STATE.md` removed

**Problem:** `BREAK_STATE.md` is **not** in the tree anymore; any remaining “see BREAK_STATE” links were dead.

**Actions:** Keep incident/regression narrative in root [`DEV_STATE.md`](../../DEV_STATE.md) (or module `DEV_STATE`) when needed; `rg BREAK_STATE` should hit only this ticket or historical mentions.

**Done when:** No markdown links to `BREAK_STATE.md`; cross-module state has a single obvious home (`DEV_STATE` + ADRs).

---

## 5. Gitignore — IDE session scratch

**Problem:** Files like **`.cursor-orange-session.txt`** (repo root) are operator/IDE noise if untracked or accidentally staged.

**Actions:** Add `.cursor-*-session.txt` or similar safe patterns to [`.gitignore`](../../.gitignore) after confirming nothing intentional must be committed.

**Done when:** `git status` stays clean after normal Cursor sessions; pattern documented in one line in `.gitignore`.

---

## 6. Task Monitor operator docs (duplicate surfaces)

**Problem:** Multiple “quick start” names and optional **`COMPLETION-REPORT.md`** references — see [`tasks/brown-alert/monitor-docs-duplicate-surfaces.md`](../brown-alert/monitor-docs-duplicate-surfaces.md).

**Actions:** Execute that brown-alert checklist: one primary operator entry, resolve **`COMPLETION-REPORT`**, clarify role of **`prompts-to-agent-mode/task-monitor-quick-start.md`** vs [`MONITOR-QUICK-START.md`](../../MONITOR-QUICK-START.md).

**Done when:** Brown-alert “Done when” satisfied; root [`README.md`](../../README.md) / [`AGENTS.md`](../../AGENTS.md) quick reference points to a single monitor operator anchor.

---

## 7. Root scripts — path audit

**Problem:** Some tools moved from **`scripts/`** to **`tests/`** (`cross-system-validate`, `check-promise-queue`, `agent-dialog-runner`). Stale paths can linger in **tasks** or **docs**.

**Actions:** Grep for `scripts/agent-dialog-runner`, `scripts/cross-system-validate`, `scripts/check-promise-queue`; align with root [`package.json`](../../package.json) (`agent-runner`, `cross-system:validate`, `check:promise-queue`).

**Done when:** No stale paths in normative docs under **`docs/`** and **`tasks/`** (spot-check + grep).

---

## Evidence (suggested)

- `npm run test:monitor`
- `npm run test:human-review` in `a2a-client` and `a2a-server` after run-human-review consolidation
- `git status` after IDE use (gitignore)
- Grep for old `scripts/` paths
