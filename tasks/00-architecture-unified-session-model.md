# Task 00: Unified Session Model

## Atomic update action
Define one canonical step/session model and one UI projection model, with explicit boundaries.

## Reason
Current flow mixes canonical protocol data and UI-safe DTOs, which makes session behavior non-obvious and error-prone.

## Affected files
- `a2a-client/vite-plugin-a2a/routes/utils/session-projection-dto.js`
- `a2a-client/vite-plugin-a2a/routes/utils/execute-projection-dto.js`
- `a2a-client/vite-plugin-a2a/routes/utils/web-session-dto.js` (compat bridge)
- `a2a-client/vite-plugin-a2a/routes/utils/web-execute-dto.js` (compat bridge)

## Validation checklist
- Confirm projected session omits `context` unless `includeContext=1`.
- Confirm projected execute strips internal client action keys.
- Confirm old module import paths still work through compatibility exports.
