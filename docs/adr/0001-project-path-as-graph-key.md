# ADR 0001: project_path as graph key

## Status

accepted

## Date

2026-02-20

## Context

Need a stable key to store and retrieve the knowledge graph per project. Options: `session_id`, `projectId`, hash of paths, or `project_path`.

## Decision

Use `project_path` — the absolute path to the project root on the client (e.g. `C:\workspace\domain-platform\websitestore.com.ua`).

- No session/project identifiers — anonymous, stateless
- Client sends path; server uses it as Map key
- Same path = same graph across requests
- Client config: `a2a-client/.a2a-client/projects.json` — `path` per project

## Consequences

- Graph key is deterministic and human-readable
- No need for client to track session or project id
- Paths may differ across machines (dev vs CI) — same logical project = different graphs unless path is normalized
