# Code hierarchy — violations

**Source:** [../code-hierarchy.md](../code-hierarchy.md) (canonical rules)

List of current violations. Fix by moving logic to the allowed layer or adding an ADR if the rule is relaxed.

---

## Status: All violations fixed (2026-02-21)

| # | Layer | Was | Fix |
|---|-------|-----|-----|
| 1 | routes → knowledge | sessions.routes.ts | session-context.service.ts wraps context-handler |
| 2 | routes → protocol | index.ts | invoke.service.ts uses parseContextBlock |
| 3 | routes → config | health.routes.ts | health.service.ts uses config |
| 4 | controllers → repos/config/middleware | auth.controller.ts | auth.service.ts holds logic |
| 5 | knowledge → ml | index-query.ts | services/index-query.service.ts (knowledge no longer imports ml) |

---

## New files

- **services/session-context.service.ts** — routes → services; wraps knowledge/context-handler
- **services/invoke.service.ts** — routes → services; uses protocol + request.service
- **services/health.service.ts** — routes → services; uses config
- **services/auth.service.ts** — controllers → services; uses repos, config
- **services/index-query.service.ts** — services orchestrate knowledge + ml
- **types/errors.ts** — AppError moved from middleware (controllers/services use types)
