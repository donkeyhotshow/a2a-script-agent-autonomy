# ADR 0018: Vite plugin and projects.json

## Status

accepted

## Date

2026-02-20

## Context

Client dev server needs project list and session storage.

## Decision

- `vite-plugin-a2a.js`: serves `/api/a2a/*` from project data
- Projects: `.a2a-client/projects.json` — `{ projects: [{ id, name, path }] }`
- Sessions: `{projectPath}/.a2a/sessions/*.json`
- `loadProjects(cwd)` — fallback `[{ id: 'default', name: 'Workspace', path: cwd }]`
- Path safety: `safePath(base, sub)` — prevent path traversal

## Consequences

- project path from client = project_path for server graph key
- Sessions stored per-project on disk
