# Task 01: Canonical-First Step Pipeline

## Atomic update action
Refactor Client API route imports to use projection modules and keep canonical step persistence as source-of-truth.

## Reason
DTO and persistence logic were coupled with web-specific naming, obscuring that stored step artifacts are canonical.

## Affected files
- `a2a-client/vite-plugin-a2a/routes/stepRoutes.js`
- `a2a-client/vite-plugin-a2a/routes/sessionRoutes.js`
- `a2a-client/vite-plugin-a2a/routes/handlers/step-handlers.js`

## Validation checklist
- `GET /sessions/:id` returns projected payload by default.
- `GET /sessions/:id?includeContext=1` still returns full canonical snapshot.
- `GET /sessions/:id/async` and `/promise/:promiseId` return projected execute payload.
