# ADR 0010: Client packages

## Status

accepted

## Date

2026-02-20

## Context

a2a-client is a monorepo. Need structure for agent, API, search, file ops.

## Decision

Packages under `a2a-client/packages/`:
- `agent` — architectural features, fs-reader, git-ops, card-manager, ignore-detector
- `api-client` — protocol (context, file blocks), async-client
- `config` — ml-strategy
- `fs-utils` — file-scanner, glob-matcher, ignore-detector
- `fulltext` — indexer, searcher
- `graph` — builder, manager, searcher
- `hybrid-search` — combines search strategies
- `rag` — indexer, chunk-manager, searcher

Web app: `web/` (Vite), projects from `.a2a-client/projects.json`.

## Consequences

- Modular; packages can be used standalone
- projects.json path → project_path for server
