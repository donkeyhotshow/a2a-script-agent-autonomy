# ADR 0012: Persistence split — PostgreSQL vs in-memory

## Status

accepted

## Date

2026-02-20

## Context

What to persist: Request, Session, Message, Graph?

## Decision

- **PostgreSQL (Prisma):** Request, Client, Project, Session, Task, Message, File, GraphEntity, GraphRelation, Embedding, IndexingJob
- **In-memory:** Knowledge graph (entities, relations) keyed by project_path — `graph-store.ts` Map

Request processor reads Request from DB, builds graph in memory, writes result to DB. Graph is not persisted to PostgreSQL by RequestProcessor; Prisma has GraphEntity/GraphRelation for future indexing flow.

## Consequences

- Request history survives restart; graph does not
- Client re-sends codeBlocks to rebuild graph
- Prisma schema is richer than current Request flow usage
