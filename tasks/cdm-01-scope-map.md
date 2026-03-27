# CDM-01: Scope Map for Cleanup Scans

## Problem
Each module needs a target list of folders for cleanup scans (hotspots only, no broad random search).

## Solution
Define in each module's DEV_STATE.md a list of folders to scan for cleanup candidates.

## Where
- File: `a2a-client/DEV_STATE.md` (add under Code Cleanup Discovery Plan)
- File: `a2a-server/DEV_STATE.md` (add under Code Cleanup Discovery Plan)
- File: `ai-integration/DEV_STATE.md` (add under Code Cleanup Discovery Plan)

## Implementation
In each module's DEV_STATE.md, add:
```markdown
### Code Cleanup Discovery Plan (Where/How to Scan)
- [x] **CCP-*-01 where-to-scan**: Primary folders зафиксированы: [list folders]
```

## Verification
Check that each module's DEV_STATE.md has a completed CCP-*-01 where-to-scan item.
