# ADR 0023: Code hierarchy (canonical)

## Status

accepted

## Date

2026-02-20

## Context

Need a single canonical description of repo layout and layer boundaries so new code and refactors follow the same structure.

## Decision

- **Canonical doc:** [docs/code-hierarchy.md](../code-hierarchy.md). All hierarchy and dependency rules live there.
- **Repo root:** a2a-server, a2a-client, docs, tasks, plans, scripts, output; docs/README.md is the doc index.
- **a2a-server/src:** routes → controllers/services; services → knowledge, repositories, protocol, ml; **knowledge** has no dependency on routes/controllers/app.
- **Naming:** kebab-case files; `*.routes.ts`, `*.controller.ts`, `*.service.ts`, `*.neuron.ts`.
- Changes to hierarchy or layer rules require ADR.

## Consequences

- One place to check where to put code and what may import what.
- Knowledge layer stays testable and reusable from scripts (e.g. process-input).
