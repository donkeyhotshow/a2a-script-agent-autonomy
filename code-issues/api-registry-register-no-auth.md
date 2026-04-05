# Registry HTTP API: no authentication (multiple routes)

**Files:** `register.ts` (`POST /api/registry/register`), `route.ts` (`POST /api/registry/route`), `health.ts` (`GET /api/registry`, `POST /heartbeat`, `POST /drain`, `DELETE /agents/:agentId`).

**Problem:** Register/route/heartbeat/drain/deregister/health are open: poison registry, force routing to attacker `endpoint`, fake heartbeats, drain or delete agents. Same class of issue as a dev stack exposed to the internet.

**Done when:** Shared registry token or mTLS on `/api/registry/*`; loopback-only in prod docs; align with `SKIP_AUTH` story.
