# P0 — `a2a-server` dev entry (`packages/server/src/index.ts`) import graph

**Goal:** `npm run dev:no-auth` from `a2a-server/` serves `GET /health` on `:3000` without bootstrap crashes.

**Done (2026-04-14):** Fixed `../../services` → `../../../services` (and `api/registry` depth); `requests.routes` → `../request/request.service`; `invoke.service` → `@a2a/server-request` + `../../../server/src/.../normalization`; `@a2a/server-transform` / `@a2a/server-daemon` LLM helpers → `../../../transform/src/index.js` and `@a2a/server-utils`; `@a2a/config` import + **server-config**: multi-path `dotenv`, `env-mapper` `aiHub` + `features`, poll/email sanitizers, `dev@localhost` in schema; invoke JSON schema path → monorepo `docs/PROTOCOL/json-schemas/`; listen port `process.env.PORT`; stubs `peerRelay.joinRoom`, `algorithmRegistry.loadFromDirectory`/`count`.

**Residual:** Action registry still probes missing `a2a-server/src/actions/definitions` (harmless); prompts/transforms dir optional; `startRequestProcessor` stub warns. Full Task Monitor green needs **Client API** (`/api/a2a/projects`) + **hub** `:11434` + LLM tags — not only `:3000`.

**Risk:** medium — **rollback:** revert commits touching `packages/server-config` and `packages/server/src`.
