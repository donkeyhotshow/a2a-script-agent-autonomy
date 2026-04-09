# Module Migration: Renames & Moves (Revised - Archive preserved)

Status: 2/6 (2024)

## 1. Update root package.json [COMPLETE]
- Edit devRoots: \"ai-hub\" → \"a2a-ai-hub\".

## 2. Standardize a2a-ai-hub packaging [COMPLETE]
- setup.py removed.
- List files; delete setup.py, package.json if present (pyproject.toml primary for Python).

## 3. Rename root runbook/ → tools/runbook/ [PENDING]
- mkdir tools if needed.
- mv runbook tools/
- Update refs: grep -r runbook/ ; fix bat/docker/scripts.

## 4. Smoke test stack [PENDING]
- .\start-all.bat
- Check ports 3000,5173,11434
- npm run central

## 5. Update this TODO.md after each step

## 6. Git commit & gh pr create --title \"refactor: module names/locations\" --body \"Per plan\"

Notes:
- Archive/ untouched.
- No deletions except redundant packaging.
- VSCode tabs outdated - ignore/reload.
