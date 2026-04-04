# ADR-0085: Notifications Plugin

## Status
Approved

## Context
Operators currently monitor sessions only via the Web UI or CLI polling. Real-time alerts are needed for long-running tasks.

## Decision
Implement a cross-platform notification plugin (desktop alerts for Halt, Fail, Evolve events).

## Consequences
- Reduced operator idle time.
- Immediate response to critical agent failures.
