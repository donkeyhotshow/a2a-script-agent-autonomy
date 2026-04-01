# Task: Analyze site-cloner scripts for a2a-server action patterns

**Priority:** Medium

**Source:** `C:\workspace\domain-platform\markdown-pipeline-automator\work\priority-3\site-cloner\scripts\`

**Scripts (3 + subfolder):**
- analyze-expo-app.mjs - Analyze Expo apps with Playwright
- install-global.mjs - Global npm package installation
- publish-package.mjs - Package publishing
- analyzers-and-segmenters/ (subfolder)

---

## Analysis Results

### Portable!

Scripts use standard Node.js modules (fs, path, execSync, playwright) - no internal @libs dependencies.

### Action Candidates

1. **`analyze-expo-app`** - Analyze Expo applications with Playwright
   - Input: URL to analyze
   - Output: Style/component extraction report

2. **`install-global`** - Global npm package installation
   - Input: package.json with bin entries
   - Output: Globally installed CLI commands

3. **`publish-package`** - Package publishing
   - Input: package path
   - Output: Published npm package

---

## Definition of Done

- [x] Scripts listed and analyzed (3 scripts)
- [x] Action candidates identified (3 portable)
- [x] DEV_STATE.md to be updated
