# ADR-0091: Handler TUI/CLI Dashboard

## Status
Approved

## Context
The current `bin/a2a` is a simple CLI. For complex distributed sessions, operators need a dense, real-time dashboard.

## Decision
Implement a Terminal UI (TUI) client (`bin/handler-tui.ts`) using `blessed` or `react-blessed`.
Sections:
- Active Sessions.
- Real-time Logs.
- Resource Monitor (Token usage).

## Consequences
- Premium operator experience.
- Effective monitoring of hundreds of active agents.
