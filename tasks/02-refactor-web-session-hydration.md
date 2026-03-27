# Task 02: Web Hydration Uses Projection

## Atomic update action
Switch default web hydration to projected session payload (no implicit debug context).

## Reason
Web UI depended on `includeContext: true`, coupling display flow to internal context structure.

## Affected files
- `a2a-client/web/js/session-store.js`
- `a2a-client/web/js/app/windows/window-session-gateway.js`

## Validation checklist
- Session restore works with `includeContext: false`.
- Window restore works with projected payload.
- Debug context can still be requested explicitly via `includeDebugContext`.
