# ai-integration-ts

TypeScript Fastify clone of `ai-integration` for drop-in runtime on port `11434`.

## Purpose

Provide endpoint-compatible AI hub behavior (`/api/*`, `/promise*`, `/promises*`, health, ops helpers) with async `promiseId` transport.

## Quickstart

- `npm install`
- `npm run dev`

Default port is `11434`.

## Key Files

- `src/index.ts` - Fastify bootstrap + route registration
- `src/routes.ts` - API endpoints (health, promise queue, llm proxy, ops)
- `src/promise-store.ts` - disk-backed promise persistence/queries
- `src/types.ts` - shared contracts
