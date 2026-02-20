# ADR 0003: In-memory graph store

## Status

accepted

## Date

2026-02-20

## Context

Knowledge graph (entities, relations) must be fast to read/write during request processing. Options: Redis, PostgreSQL, in-memory Map.

## Decision

Use in-memory `Map<project_path, StoredGraph>` in `graph-store.ts`.

- `buildAndStoreGraph(key, entities)` — merge and store
- `getGraph(key)` — read
- No persistence across server restarts

## Consequences

- Fast, no I/O
- Graph lost on restart — client can re-send codeBlocks to rebuild
- Single-instance only; no shared state across replicas
