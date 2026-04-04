# ADR-0076: UI Trajectory Copy (RA.Aid style)

## Status
Approved

## Context
Debugging complex agent trajectories requires sharing the full state of the session. Manually gathering files from `storage/sessions` is slow.

## Decision
Add a "Copy Trajectory" button in the Web UI. This button will serialize the entire `context.history` and session metadata into a JSON blob and copy it to the clipboard.

## Implementation
- React component update in `a2a-client`.
- Clipboard API integration.

## Consequences
- Easier debugging and state sharing.
- Reproducibility of agent failures.
