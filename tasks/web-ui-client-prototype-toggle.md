# WEB-UI — Client/Prototype UI toggle

**Status:** completed (2026-04-08)  
**Owner surface:** `a2a-client` web UI + routing/bootstrap integration

## Problem

Operator needs to switch between current client UI and new prototype UI without changing branches or manual file edits.

## Goal

Add a deterministic UI switcher that toggles between:

1. Current production client interface
2. New prototype interface

Switch must be operator-visible, reversible in one action, and safe for live monitor/session workflows.

## Inputs

- Current `a2a-client` web entry and routing structure.
- Existing prototype UI source (or placeholder route/component if prototype is still WIP).
- Runtime/env config strategy used by current web app.

## Outputs

- UI toggle control in client web interface.
- Active-interface indicator (which mode is currently selected).
- Persisted selection strategy (session/local storage or explicit query/env rule).
- Documentation for operator usage and fallback behavior.

## Side effects

- Web routing/bootstrap updates.
- Possible additions to settings/state store for mode persistence.
- Integration touchpoints with session screens and monitor-driven flows.

## Constraints

- Must not break Client API flow (`/api/a2a/sessions`, `/next`, `/async`).
- Must not remove current UI; only add controlled toggle path.
- Must keep mobile + desktop usable.
- Must keep default behavior deterministic when no preference is set.

## Acceptance criteria

1. Toggle is present in UI and switches mode without rebuild.
2. Both interfaces load and allow normal session flow operations.
3. Reload preserves selected mode (or uses documented deterministic default).
4. No regressions in baseline web/session tests for affected scope.
5. Operator docs updated with:
- where toggle lives
- default mode
- how to force mode for debugging
- rollback path if prototype mode fails

## Verification plan

1. Run `npm --prefix a2a-client run test:web` for integration sanity.
2. Run one manual session in each mode (`create -> next -> async`) and record evidence.
3. Run `npm run monitor:once` after UI change to verify monitor-driven flow unaffected.

## Evidence (2026-04-08)

- Implemented in:
  - `a2a-client/packages/web/templates/header.html` (`Interface` selector)
  - `a2a-client/packages/web/index.html` (prototype URL setting field)
  - `a2a-client/packages/web/js/app/project-manager.js` (persisted mode/url)
  - `a2a-client/packages/web/js/app/event-handlers.js` (switch behavior + redirect)
  - `a2a-prototype/components/InterfaceSwitch.tsx` (return to client UI)
  - `a2a-prototype/app/page.tsx` (prototype switch mounted)
- Automated check:
  - `npm --prefix a2a-client run test:web` -> **6 files, 52 tests passed**
