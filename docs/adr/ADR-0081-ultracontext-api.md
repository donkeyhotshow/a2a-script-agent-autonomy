# ADR-0081: Ultracontext API

## Status
Approved

## Context
Agent context management is currently stateless. Long sessions lose coherence, and there's no way to revert context to a specific point in time.

## Decision
Implement `UltraContext` — a git-like versioning system for agent context.
Operations:
- `create(id)`: Initialize context.
- `append(id, data)`: Add new info and create a version.
- `timeTravel(id, version)`: Restore context to a previous state.

## Consequences
- Perfect session recall.
- Ability to undo bad agent decisions by reverting context.
- Structured memory history.
