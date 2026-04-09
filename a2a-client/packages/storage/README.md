# Storage Package

This package contains session storage utilities for the A2A client ecosystem.

## Files

- `session-id.js` - Session ID validation and generation utilities
- `src/session-sort.mjs` - Session sorting utilities
- `src/session-stage-derive.mjs` - Session stage derivation logic
- `src/session-paths.mjs` - Session path resolution utilities (formerly project-sessions-dir.mjs)

## Purpose

The storage package provides filesystem-based session storage capabilities, including session ID management, session sorting, stage derivation, and path resolution for both flat (.a2a/sessions/) and nested (.a2a/sessions/{id}/step-*/) storage formats.