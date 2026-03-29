# ADR-0031: Action-Key Shape as Protocol Contract

Status: accepted
Date: 2026-03-29

## Context

The A2A protocol and simulation contract require a strict shape for tool interaction payloads.
- `execute` must be a single-key object in the wire protocol (e.g. `{ "form": {...} }`, `{ "read-file": {...} }`).
- `result` must also be a single-key object (or `{}` when no action result is available).

This invariant is enforced in `validator.js` and in request/response adapters for both runtime and simulation paths.

## Problem

Some docs were corrupted by ANSI/control artifacts, causing invalid symbols and truncated keys:
- `execute` displayed as `\x1bexecute`, `read-file` as `\x1bead-file`.
- `form` displayed as `\x0corm`.
- `validator.js` references were split by hidden characters.

This made the ADR hard to understand and violated the intent of action-key consistency.

## Decision

1. Keep action-key shape as a protocol-level contract:
   - `execute` object must contain exactly one action key.
   - `result` object must contain at most one action key (or `{}` when none).
2. Reject `execute`/`result` objects with non-printable control chars in action key names.
3. Apply this in server validators, schema definitions (`schemas/protocol/*.json`), and docs (`AGENTS.md`, `docs/new-request-flow/PROTOCOL.md`).
4. Keep ADR text clean of ANSI sequences and other non-printable characters.

## Consequences

- Simulations and API flows can perform strict compliance checks.
- Canonical tokens are preserved: `execute`, `result`, `form`, `read-file`, `validator`.
- Avoids parsing mismatches and maintains predictable routing.

## Related ADR

- [ADR-0026](./ADR-0026-server-llm-request-prep.md)
- [ADR-0029](./ADR-0029-server-interrupt-loop.md)

