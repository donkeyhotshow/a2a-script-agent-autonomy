# ADRs (Architecture Decision Records)

This directory contains project-level Architecture Decision Records.

## Why

We use ADRs to record decisions that affect multiple layers (web, client api, server, ai hub) so that:

- future changes can be evaluated against agreed constraints
- simulations and tooling can enforce the decisions
- contributors have a single place to discover "why" something is built this way

## Format

Each ADR is a Markdown file:

- `ADR-0001-...md`
- `Status`: proposed | accepted | deprecated | superseded

Recommended sections:

- Context
- Decision
- Consequences
- Notes / Follow-ups

## Index

- `ADR-0001-simulations-as-golden-standard.md` - simulations are the golden standard for comparing behavior across layers

