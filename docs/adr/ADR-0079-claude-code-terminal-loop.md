# ADR-0079: Claude Code Terminal Loop

## Status
Approved

## Context
Existing A2A GrayRoom orchestrator is powerful but complex for simple coding tasks. We need a fast, terminal-first loop similar to Claude Code for rapid iteration.

## Decision
Implement a simplified CLI loop: `observe` (git status, lints, errors) → `plan` (LLM strategy) → `act` (apply file changes) → `reflect` (verify result) → `safety` (policy check).

## Consequences
- Faster dev cycle for small fixes.
- Improved terminal UX.
- Lower token usage for simple tasks.
