# Task 37: Client session log and message projection model

## Goal

Define and implement a **dual session storage model on the Client API side**:

- A canonical, full **exchange log** aligned with simulations (`request.json`, `request.md`, `response.md`, `response.json` per step).
- A derived, lightweight **message projection** (`messages[]`) used by Web UI to render dialog sessions.

Server remains stateless; all session storage lives in Client API.

## Background

From:
- `docs/new-request-flow/SESSION-FLOW.md`
- `docs/new-request-flow/WEB-UI.md`
- `docs/new-request-flow/PROTOCOL.md`
- `simulations/SCHEMA.md`

we have:

- Session lifecycle (`PENDING` → `READY` → `IN_PROGRESS` → `WAITING_CONFIRMATION` → `COMPLETED` / `CANCELLED` / `ERROR`).
- Canonical request/response pipeline and context rules.
- Web UI expectations for showing a chat-like dialog in SessionPanel.

Currently, Client API sessions store context, selectedAction, some results and logs, but there is no normalized:
- per-step protocol log mirroring simulations, and
- explicit `messages[]` projection for Web UI.

## Requirements

- **1. Canonical per-step log schema**
  - In Client API’s session model, add a `steps[]` or `exchangeLog[]` array where each entry captures:
    - `request`: full body sent to `/api/v1/invoke` (the runtime `request.json`).
    - `requestMd?`: prompt string if this step involved LLM.
    - `response`: full `response.json` from server.
    - `responseMd?`: LLM output when available.
    - `timestamp`, `durationMs`, `error?`.
  - Align field names and semantics with `simulations/SCHEMA.md` so server/client logs are comparable to sims.

- **2. Message projection (`messages[]`)**
  - Define a `messages` array in session state, with entries like:
    - `{ id, role: 'user' | 'assistant' | 'system', text, stepIndex, source }`.
  - Build/maintain `messages[]` from:
    - user inputs (`result.message` from Web),
    - server outputs that should be shown in dialog:
      - `execute.message` text,
      - relevant bits of `context.history` when needed for consistency.
  - Keep `messages[]` as **derived**: always possible to recompute from `exchangeLog` + a small set of rules.

- **3. Update session serialization**
  - Ensure that session JSON persisted to disk / DB includes:
    - `exchangeLog[]` (full protocol-level history),
    - `messages[]` (or enough data to reconstruct it on load).
  - Document which fields are canonical (log) vs. projections (messages) to avoid accidental divergence.

- **4. Web UI integration**
  - Update `a2a-client/web/js/session-manager.js` (and related modules) to:
    - consume `messages[]` directly when rendering dialog views,
    - stop inferring chat history from ad-hoc fields.
  - Expose a simple session DTO in Client API responses for Web:
    - `{ id, status, context, messages, execute, logs, createdAt, updatedAt }`.

- **5. Limits and retention**
  - Add basic limits and retention rules:
    - max number of steps per session (e.g. 200),
    - max size of log in bytes,
    - simple truncation/archival strategy (e.g. drop oldest steps, but preserve last N for Web + a pointer to archived log).

## Acceptance Criteria

- Client API sessions contain:
  - a canonical `exchangeLog[]` aligned with simulations,
  - a stable `messages[]` projection used by Web to render dialog history.
- Web UI SessionPanel no longer depends on ad-hoc structures; it renders solely from `messages[]` + current `execute`.
- New tests cover:
  - log entries appended correctly for each invoke cycle,
  - messages derived correctly from common AI-Actions flows (`dialog`, `coder`, `auto-ai`).

## References

- `docs/new-request-flow/SESSION-FLOW.md`
- `docs/new-request-flow/WEB-UI.md`
- `simulations/SCHEMA.md`
- `a2a-client/packages/api-client/src/types/session.ts`
- `a2a-client/web/js/session-manager.js`

## Status
- ✅ Reviewed sequentially on March 4, 2026 (Task 37) and recorded the canonical `exchangeLog[]` plus derived `messages[]` expectations for Client API sessions.
- 📌 Requirements and acceptance criteria logged for when the session DTO, serialization, and Web UI consumption work is scheduled.
- 📝 Next steps: formalize the DTO/schema changes, wire `exchangeLog`/`messages` updates into Client API + Web UI `SessionPanel`, and capture limits/retention before moving to implementation.
