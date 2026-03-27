# A2A Server

Stateless A2A backend for invoke processing, routing, transforms, and async promise polling.

## Current Architecture

- Runtime: Node.js 20+, TypeScript, Express
- Core mode: stateless request processing (no server-side session storage)
- Main flow: `POST /api/v1/invoke` -> sync execute or async `promiseId`
- Async polling: `/api/v1/requests/:promiseId/status` and `/api/v1/requests/:promiseId/result`
- Session bridge route for client API: `POST /api/a2a/sessions/:sessionId/next`

## Quick Start

```bash
cd a2a-server
npm install
npm run dev:local
```

## Health Checks

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/health
```

## API Endpoints (Current)

- `POST /api/v1/invoke` - main invoke endpoint
- `GET /api/v1/health` - API health endpoint
- `GET /api/v1/requests/status?ids=id1,id2` - batch promise status
- `GET /api/v1/requests/:promiseId/status` - single promise status
- `GET /api/v1/requests/:promiseId/result` - single promise result
- `POST /api/a2a/sessions/:sessionId/next` - session-oriented invoke bridge

## Scripts

```bash
npm run dev
npm run dev:local
npm run build
npm run start
npm run test
npm run lint
npm run sim:lint -- --all --json
npm run sim:validate -- --sim <name> --json
```

## Environment

See `.env.example` for full configuration.

Key vars used most often:

- `PORT`
- `SKIP_AUTH`
- `DEFAULT_SYNC_MODE`
- `AI_HUB_URL`
- `LLM_PROVIDER`
- `OLLAMA_MODEL`
- `A2A_MAX_INTERRUPT_TURNS`

## Documentation

- `docs/EXTENDING-LLM-ACTIONS.md`
- `docs/LLM-REQUEST-PREP.md`
- `docs/TRANSFORM-OPS.md`
- `docs/GRAY-ROOM.md`
- `docs/Router.md`

## Removed Legacy Systems

This server documentation no longer describes retired stack parts such as Prisma migrations, PostgreSQL/pgvector persistence, Redis/BullMQ queues, or server-side session storage.

## License

MIT
