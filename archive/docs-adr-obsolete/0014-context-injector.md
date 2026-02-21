# ADR 0014: Context injector and @INJECT

## Status

accepted

## Date

2026-02-20

## Context

Neurons have @INJECT actions. Need to resolve and merge injected content.

## Decision

- `context-store.ts`: builtin blocks (e.g. `neuron-context-laravel-11`), 512KB max per block
- `registerContextBlock(id, content)` — user blocks; builtin protected unless `allowOverwriteBuiltin`
- `getContextBlock(id)` — builtin first, then user
- `context-injector.ts`: `resolveInjections(activatedNeurons)` — dedupe by target, first wins
- `mergeInjectedContext()` — join with `\n\n`

## Consequences

- Neurons inject Laravel structure/docs into context
- Stateless `processNewTaskToContext` activates neurons but doesn't use injected content in result (session flow does)
