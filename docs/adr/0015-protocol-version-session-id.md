# ADR 0015: Protocol version and session_id

## Status

accepted

## Date

2026-02-20

## Context

Context block validation. Stateless Requests use project_path; session flow uses session_id.

## Decision

- `version: "1.0"` required (context-parser)
- `session_id` required by types and parser; Requests API uses `"stateless"` or client-provided
- Types: `a2a-codebase-agen-v1.md`; implementation: `requirements.md`
- Optional: `new_task`, `architectural_features`, `tasks`, `request_files`, `continue`, `confirm`, `errors`

## Consequences

- Parser strict; Requests can pass `session_id: "stateless"` for compatibility
- project_path not in ContextBlock type but used in request flow
