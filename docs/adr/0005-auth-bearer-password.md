# ADR 0005: Auth — Bearer/Basic password

## Status

accepted

## Date

2026-02-20

## Context

API needs authentication. Options: JWT, API keys, OAuth, or simple password.

## Decision

- `Authorization: Bearer <password>` or `Basic base64(email:password)`
- Password from `A2A_SERVER_PASSWORD` env (default `a2a_dev_password`)
- `SKIP_AUTH=1` or `NODE_ENV=development` — bypass, set `req.client`
- No JWT, no refresh tokens for API access

## Consequences

- Simple for dev and single-tenant
- Password in env; rotate via deployment
- No per-client isolation for Requests API
