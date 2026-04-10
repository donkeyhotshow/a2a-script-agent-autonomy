# Shared Utilities Package

This package contains shared utilities and contracts used across the A2A client ecosystem.

## Files

- `api-helpers.js` / `api-helpers.d.ts` - API helper functions for building URLs, headers, and normalizing responses
- `client-api-envelope.mjs` - Utilities for handling API response envelopes and validation
- `internal-client-action-keys.mjs` - Internal client action keys that are stripped from web-facing DTOs
- `session-sort.mjs` - Session sorting utilities

## Purpose

The shared package establishes the public contract between client-side packages, server-side modules, AI integration components, and plugin systems. These utilities are consumed by the SDK, Vite plugin, and other packages to ensure consistent communication patterns and data handling.