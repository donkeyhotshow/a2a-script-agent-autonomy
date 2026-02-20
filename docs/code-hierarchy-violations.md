# Code hierarchy — violations

**Source:** [code-hierarchy.md](code-hierarchy.md) (canonical rules)

List of current violations. Fix by moving logic to the allowed layer or adding an ADR if the rule is relaxed.

---

## 1. Routes → knowledge (forbidden)

| File | Import | Rule |
|------|--------|------|
| **routes/sessions.routes.ts** | `createSessionContext`, `getSessionContext`, `handleRootContext`, `RootContext` from `../knowledge/context-handler.js` | Routes may depend only on controllers, middleware, services. No direct knowledge. |

**Fix:** Introduce a session-context service (or extend session.service) that wraps `context-handler`; sessions.routes.ts should call that service (or a controller that uses it), not knowledge.

---

## 2. Routes → protocol (forbidden)

| File | Import | Rule |
|------|--------|------|
| **routes/index.ts** | `parseContextBlock` from `../protocol/context-parser.js` | Routes → controllers, middleware, services only. Protocol is not in the list. |

**Fix:** Move /invoke and /message handling into a controller or a dedicated service that uses protocol; routes only call that controller/service.

---

## 3. Routes → config (forbidden)

| File | Import | Rule |
|------|--------|------|
| **routes/health.routes.ts** | `checkDatabaseHealth`, `checkRedisHealth` from `../config/database.js`, `../config/redis.js` | Routes → controllers, middleware, services only. |

**Fix:** Add a health.service that uses config and exposes check methods; health.routes should use health.service (or a health controller).

---

## 4. Controllers → repositories, config, middleware (forbidden)

| File | Import | Rule |
|------|--------|------|
| **controllers/auth.controller.ts** | `clientRepo` from `../repositories/client.repository.js` | Controllers → services only. No direct repositories. |
| **controllers/auth.controller.ts** | `config` from `../config/index.js` | Controllers → services only. Config belongs in services or app. |
| **controllers/auth.controller.ts** | `AppError` from `../middleware/error.middleware.js` | Prefer types in types/ for errors; controller should not depend on middleware. |

**Fix:** Move auth logic (token signing, repo access, config usage) into auth.service; controller only calls auth.service and maps responses. Move AppError (or its shape) to types if needed by controllers.

---

## 5. Knowledge → ml (forbidden)

| File | Import | Rule |
|------|--------|------|
| **knowledge/index-query.ts** | `hybridSearch` from `../ml/search.service.js` | Knowledge may depend only on types, utils. No ml. |

**Fix:** Inject search as a dependency (e.g. from request-processor) or move index-query orchestration into a service that calls both knowledge and ml; keep knowledge/index-query as a pure “build query” layer and let the service call ml. Alternatively: move `queryIndex` into services and have it import both knowledge (question building) and ml (search).

---

## Summary table

| Layer | Violation | File(s) |
|-------|-----------|---------|
| routes | → knowledge | sessions.routes.ts |
| routes | → protocol | index.ts |
| routes | → config | health.routes.ts |
| controllers | → repositories, config, middleware | auth.controller.ts |
| knowledge | → ml | index-query.ts |

**Total: 5 violation groups.**
