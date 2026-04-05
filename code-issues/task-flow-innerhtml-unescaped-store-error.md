# TaskFlow: unescaped `innerHTML` for `storeResult.error`

**Files:** `task-flow/render-form.js` and `task-flow/render-layout.js` under both `packages/web/web/js/` and `packages/web/js/`.

**Problem:** `contentEl.innerHTML = storeResult.error` (render-form ~15; render-layout ~114 and ~230) — other branches use `escapeHtml()`; these paths do not.

**Done when:** `escapeHtml(storeResult.error)` or `textContent`; keep duplicate trees in sync if still split.
