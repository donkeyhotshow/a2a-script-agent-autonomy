# ADR 0007: Relation types

## Status

accepted

## Date

2026-02-20

## Context

Knowledge graph needs relation types between entities.

## Decision

`relation-mapper.ts` defines: `uses`, `creates`, `extends`, `implements`, `has-many`, `belongs-to`, `belongs-to-many`, `has-one`, `calls`, `references`, `renders`, `provides`, `handles`, `validates`.

- `handles`: controller → request/use-case
- `validates`: request → model
- `renders`: vue page/component → component
- Eloquent: `has-many`, `belongs-to`, etc.

`buildRelationGraph(entities)` → adjacency lists, `findPath`, `getDependencies`, `calculateImportance`, `findCircularDependencies`.

## Consequences

- Rich graph for traversal and impact analysis
- Relation extraction depends on entity metadata quality
