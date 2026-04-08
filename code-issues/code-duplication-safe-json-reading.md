# Code Duplication: Safe JSON Reading Function

## Description
Multiple files implement nearly identical functions to safely read and parse JSON files with error handling.

## Files Involved
- `scripts/audit-session-storage-to-tasks.mjs` (lines 23-30)
- `scripts/promise-artifacts-report.mjs` (lines 46-53)

## Duplicated Code
Both use `fs.readFileSync(filePath, 'utf8')` inside a try-catch, with `JSON.parse`.

## Impact
Moderate; affects JSON file handling across scripts.

## Recommendation
Create a common `utils.js` module with a standardized `safeReadJson` function.