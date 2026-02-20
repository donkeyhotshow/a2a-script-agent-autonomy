# ADR 0008: Laravel 11 base neurons

## Status

accepted

## Date

2026-02-20

## Context

Neurons hold Laravel 11 DNA (conventions, paths). Need initial set.

## Decision

**8 base neurons** in `knowledge/neurons/base/` (see [LOADING.md](../../LOADING.md) § Neurons, [a2a-server/docs/neurons-catalog.md](../../a2a-server/docs/neurons-catalog.md) — autogen `npm run neurons:doc`):
- `bootstrap` — `activatesWhenEmpty: true`; request_files: composer.json, package.json, app/, resources/ (discovery when pool empty)
- `validation` — FormRequest, rules(), validate(); **task triggers:** "validation", "validate", "rules"
- `auth` — Policy, Guard, middleware('auth')
- `eloquent` — Model, belongsTo, hasMany, factory; actions: inject + request_files (migrations, Models)
- `routing` — Route::, Controller, web.php
- `views` — Inertia, .vue, resources/js/
- `testing` — Pest, PHPUnit, TestCase, factory()
- `project-detector` — laravel/framework, composer (architecture)

Triggers match **content** (code patterns, keywords, **taskText** for task-trigger neurons): e.g. `FormRequest`, `extends Model`, `belongsTo`. Paths in store are conventions only. See [neurons-and-paths-law.md](../neurons-and-paths-law.md). `activateNeurons(ctx)` returns matched neurons. Actions: `inject` (context block), optional `request_files` (paths/glob/semantic; client resolves per [requirements.md](../../a2a-client/docs/requirements.md) §3.4.4).

## Consequences

- Extensible via `registerNeuron()`
- Triggers are content-based (fileContents, projectStructure, taskText)
- Catalog and types: [a2a-server/docs/neurons.md](../../a2a-server/docs/neurons.md) — CLI, dependsOn, conflictsWith
