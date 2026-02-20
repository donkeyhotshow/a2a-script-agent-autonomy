# Architecture Audit — Plans vs Implementation

**Date:** 2026-02-20

## Target (async-protocol-change.md)

| Component | Target |
|-----------|--------|
| **Server DB** | clients + requests only |
| **Server routes** | /requests (POST, GET status, GET result, DELETE) |
| **Client projects** | .a2a-client/projects.json (vite-plugin /api/a2a) |
| **Client sessions** | .a2a/sessions/*.json (vite-plugin /api/a2a) |
| **Client API** | POST /requests, poll status/result |

## Client scan (actual)

| Module | Source | Uses |
|--------|--------|------|
| **Projects** | Storage.loadProjects() | /api/a2a/projects (vite-plugin, local) ✅ |
| **Sessions** | Sessions.load(), create(), open() | /api/v1/sessions (SERVER) ❌ |
| **Storage** | getSessions, saveSession | /api/a2a/.../sessions (vite-plugin) — **не используется** |

**Проблема:** Sessions.js вызывает сервер (/api/v1/sessions), а не .a2a. Vite-plugin уже умеет .a2a/sessions, но Sessions.js его не использует.

## Current server (отклонение от target)

| Component | Status |
|-----------|--------|
| **DB** | Client, Project, Session, Message, Request, ... (лишние) |
| **Routes** | /sessions, /requests |
| **To remove** | sessions.routes, session.service, message.service |

## Doc status

| Doc | Status |
|-----|--------|
| a2a-server-database-schema.md | ✅ Target: clients + requests only |
| async-protocol-change.md | ✅ Source of truth |
| Client migration | Sessions.js → Storage (api/a2a) вместо /api/v1/sessions |
