# ADR 0008: Laravel 11 base neurons

## Status

accepted

## Date

2026-02-20

## Context

Neurons hold Laravel 11 DNA (conventions, paths). Need initial set.

## Decision

7 base neurons in `knowledge/neurons/base/`:
- `validation` — FormRequest, rules(), validate()
- `auth` — Policy, Guard, middleware('auth')
- `eloquent` — Model, belongsTo, hasMany, factory
- `routing` — routes/, Route::, Controller
- `views` — Inertia, .vue, resources/js/
- `testing` — Pest, PHPUnit, TestCase, factory()
- `project-detector` — composer.json, laravel/framework

Triggers match **content** (code patterns, keywords): e.g. `FormRequest`, `extends Model`, `belongsTo`. Paths in `store` are conventions only, not triggers. See [neurons-and-paths-law.md](../../docs/neurons-and-paths-law.md). `activateNeurons(ctx)` returns matched neurons. @INJECT actions inject knowledge into context.

## Consequences

- Extensible via `registerNeuron()`
- Triggers are content-based (fileContents, projectStructure, taskText)
