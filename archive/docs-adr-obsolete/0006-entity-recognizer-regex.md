# ADR 0006: Entity recognizer — regex-based

## Status

accepted

## Date

2026-02-20

## Context

Extract entities (model, controller, service, vue-component, …) from code. Options: AST (tree-sitter, babel), regex, or ML.

## Decision

Regex-based patterns in `entity-recognizer.ts`:
- PHP: `extends Model`, `FormRequest`, `Controller`, `Policy`, `belongsTo`, `hasMany`, …
- Vue/TS: `defineComponent`, `defineProps`, `Inertia`, `createInertiaApp`, …

Output: `RecognizedEntity` with `id`, `type`, `filePath`, `name`, `metadata` (relationships, imports, props).

## Consequences

- Fast, no parser deps
- May miss dynamic patterns, traits, complex namespaces
- Future: embeddings/ML for semantic matching (README mentions Plexer ML)
