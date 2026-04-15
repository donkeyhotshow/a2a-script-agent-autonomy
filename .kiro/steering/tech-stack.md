# Tech Stack

## Languages & runtimes

- TypeScript 5.3+ (server, client packages)
- JavaScript ESM (scripts, tools, orchestrator)
- Python 3.x (a2a-ai-hub proxy)
- Node.js >=20.0.0

## Key frameworks & libraries

- **express** ^4.x — HTTP server (a2a-server)
- **vue** ^3.4 + **vite** ^5.4 — Web UI (a2a-client)
- **vitest** ^2/^4 — unit + integration tests
- **playwright** ^1.40 — E2E tests
- **zod** ^3.22 — runtime schema validation
- **bullmq** ^5 + **ioredis** — promise queue (async transport)
- **winston** ^3 — logging (server-side)
- **tsx** ^4 — TypeScript execution without build step
- **fastapi / uvicorn** — AI Hub HTTP server (Python)
- **vm2** ^3 — sandboxed script execution
- **libp2p** — P2P networking layer
- **loro-crdt** — CRDT for collaborative state

## Package manager & monorepo tool

- **npm workspaces** — root + a2a-server/packages/* + a2a-client/packages/*
- **pnpm** — used inside a2a-server (pnpm-workspace.yaml)
- Root `package.json` is the orchestrator entry; do NOT run `npm install` inside sub-packages to refresh the live stack

## Build & compile

- **tsc** (NodeNext module resolution) — a2a-server build → `dist/`
- **vite** — a2a-client web UI build
- `tsx watch` — dev mode for a2a-server (hot reload, no restart needed)

## Testing

- `npm test` — vitest run (unit, from package root)
- `npm run test:before-start` — full offline gate (indirect + server unit + test:monitor + verify:audit-session-storage)
- `npm run sim:lint -- --all` + `npm run sim:validate -- --all` — simulation golden-standard checks
- `npm run test:e2e` — playwright E2E (requires live stack)
- Always use `vitest run` (not watch mode) in CI/automation

## Code style & linting

- **eslint** ^8 + **@typescript-eslint** — a2a-server (`packages/server/src/**/*.ts`)
- **prettier** ^3 — formatting
- Config files: `a2a-server/.eslintrc.cjs`, root `tsconfig.json`
- `moduleResolution: NodeNext` → `.js` extensions **required** in all imports
