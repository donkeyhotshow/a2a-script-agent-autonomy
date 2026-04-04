# ADR-0089: ACP Communication Protocol

## Status
Proposed

## Context
Inter-agent communication is currently ad-hoc. We need a standardized protocol to support external agents and diverse architectures.

## Decision
Implement the Agent Communication Protocol (ACP) — a RESTful-first shim for sending sync, async, and streaming messages between agents.

## Consequences
- Standardized cross-agent communication.
- Support for external AI agents joining the A2A ecosystem.
