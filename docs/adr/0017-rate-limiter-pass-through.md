# ADR 0017: Rate limiter — pass-through

## Status

accepted

## Date

2026-02-20

## Context

Rate limiting for auth, API, search. Redis needed for distributed counters.

## Decision

- `createRateLimiter(config)` — middleware exists
- `authRateLimiter`, `apiRateLimiter`, `searchRateLimiter` — key generators defined
- Implementation: TODO; Redis incr/pexpire not wired
- All limiters currently `next()` — pass-through

## Consequences

- No rate limiting in production until Redis wired
- Config: `rateLimitWindowMs`, `rateLimitMaxRequests`
