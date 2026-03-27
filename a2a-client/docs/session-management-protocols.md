# Session Management Protocols (Current)

This file is a compact reference for session correctness.

## Canonical Web Endpoints

Use Web UI routes under `/api/a2a/*`:

- `POST /api/a2a/sessions` - create session
- `GET /api/a2a/sessions` - list sessions
- `GET /api/a2a/sessions/{id}` - load session state
- `PUT /api/a2a/sessions/{id}` - update session metadata
- `POST /api/a2a/sessions/{id}/next` - submit user input (ack-first)
- `GET /api/a2a/sessions/{id}/async` - poll async status for active step
- `GET /api/a2a/sessions/{id}/promise/{promiseId}` - legacy promise poll

## Ack-First Contract

`POST /sessions/{id}/next` does not return full session state. It returns acceptance info:

```json
{
  "success": true,
  "accepted": true,
  "step": 3,
  "asyncPending": true,
  "promiseId": "prom_..."
}
```

Client must then:

1. Poll `/sessions/{id}/async` while `asyncPending = true`
2. Re-read `/sessions/{id}` for the latest `execute/context/messages`

## Lifecycle Diagrams (with storage interactions)

### Create -> Next -> Async Polling -> Final Hydrate

```text
Browser/UI                      Client API (/api/a2a/*)                     Storage (step files)
----------                      -----------------------                      --------------------
POST /sessions  ------------->  create session id                    --->    create sessions/{sid}/
GET /sessions/{sid} <--------   return initial snapshot              <---    READ highest completed step (if any)

POST /sessions/{sid}/next ---->  accept user input
                                 WRITE {N}/client-result.json   --->        user result for step N
                                 WRITE {N}/request-to-server.json --->      invoke payload for step N
                                 invoke A2A server
                                 if async:
                                   WRITE {N}/server-promise.json --->       { promiseId, status: pending }
                                 else:
                                   WRITE {N}/server-response.json --->       final execute/context/result
                                   WRITE {N}/messages.json        --->       step message slice
<---- ack { accepted, step, asyncPending }

GET /sessions/{sid}/async ---->  READ active {N}/server-promise.json --->   pending promise metadata
                                 poll upstream result
                                 when completed:
                                   DELETE {N}/server-promise.json --->       clear pending marker
                                   WRITE  {N}/server-response.json --->      finalized step output
                                   WRITE  {N}/messages.json        --->      finalized messages
<---- { asyncPending: false, promiseStatus: completed }

GET /sessions/{sid} <---------   READ highest completed step + merge messages
                                 READ {1..N}/messages.json         --->      rebuild timeline
                                 READ {N}/server-response.json     --->      execute/context projection
```

### Recovery Path: Reload -> Restore -> Async Resume

```text
Browser reload                  Client API/session loader                      Storage (step files)
--------------                  -------------------------                      --------------------
Page open ------------------->  GET /sessions/{sid}
                                scan step folders for latest state
                                READ highest {K}/server-response.json --->    authoritative execute/context
                                READ {1..K}/messages.json            --->     rebuild conversation
<---------------------------   return session snapshot + asyncPending/promiseStatus

if asyncPending = true:
  start polling loop -------->  GET /sessions/{sid}/async
                                READ pending {K+1}/server-promise.json --->  detect in-flight step
                                poll upstream status
                                if still pending: keep as-is
                                if completed:
                                  DELETE {K+1}/server-promise.json --->      remove pending file
                                  WRITE  {K+1}/server-response.json --->      persist final step
                                  WRITE  {K+1}/messages.json        --->      persist messages
<---------------------------   return completed async state

final hydrate -------------->   GET /sessions/{sid}
                                READ highest completed response + merged messages
```

## Canonical vs UI Projection

- **Canonical session state**: step artifacts (`request-to-server.json`, `server-response.json`, `client-result.json`, `messages.json`) remain source-of-truth.
- **UI projection**: web responses expose projected `execute` and hide internal action payloads by default.
- **Debug-only full payload**: use `?includeContext=1` when raw canonical context is required.

## Step-File Source of Truth

Session state is reconstructed from step folders:

```text
storage/sessions/{SESSION_ID}/{STEP}/
  client-result.json
  request-to-server.json
  server-promise.json   (async only)
  server-response.json  (final step state)
  messages.json
```

Rules:

- Highest step with `server-response.json` is the effective current step.
- `request-to-server.json` is written before invoke.
- `server-promise.json` exists only while async work is pending.
- `messages.json` slices are merged across steps to rebuild conversation.

## Session Correctness Checklist

- Endpoint usage is `/api/a2a/*` (not `/api/sessions/*`).
- Execute/result payloads follow action-key shape (`{ "form": {...} }`, `{ "message": {...} }`).
- Async flow resolves into the same step folder where `server-promise.json` was created.
- Reloading the page restores loader/state from persisted step files.

## Red-Room Coupling

When server returns a tool `execute`, client enters red-room flow:

1. Run tool action on client side.
2. Persist tool output as step `client-result.json`.
3. Send next invoke via `POST /sessions/{id}/next`.
4. Complete with `server-response.json` (or wait through `/async` first).

This flow must preserve normal step numbering and artifact guarantees.

## Gray room (no extra client step)

**Gray room** is server-only (`interrupt` chain). It does **not** add `client-result.json` / `/next` on the client for each substep. You still see one outward response per invoke; optional `interruptTrace` may appear in context. Spec: [`../../a2a-server/docs/GRAY-ROOM.md`](../../a2a-server/docs/GRAY-ROOM.md), client view: [GRAY-ROOM.md](./GRAY-ROOM.md).

## Related Docs

- [WEB_UI_PROTOCOL.md](./WEB_UI_PROTOCOL.md)
- [SESSION-STORE-ARCHITECTURE.md](./SESSION-STORE-ARCHITECTURE.md)
- [SESSION-STORAGE.md](./SESSION-STORAGE.md)
- [api-client-server-logic.md](./api-client-server-logic.md)
- [api-testing-plan.md](./api-testing-plan.md)
- [RED-ROOM.md](./RED-ROOM.md)
- [GRAY-ROOM.md](./GRAY-ROOM.md)
