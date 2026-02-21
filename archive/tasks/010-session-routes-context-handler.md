# Task 010: Session routes — wire context-handler

**Index:** [tasks/README.md](README.md) | **Analysis:** [NEURON-ENVIRONMENT-ANALYSIS.md](NEURON-ENVIRONMENT-ANALYSIS.md)

---

## Problem

`handleRootContext`, `handleNewTask`, `handleContext` exist in context-handler but are NOT called from [sessions.routes.ts](../a2a-server/src/routes/sessions.routes.ts). Session API creates sessions, lists messages — but never activates neurons. [entry-points.md](../a2a-server/docs/entry-points.md) describes flow: POST /sessions with rootContext → handleRootContext.

## Solution

Extend session API to support context-handler flow:
- **Option A:** New endpoint `POST /sessions/:id/root-context` — accepts rootContext, calls handleRootContext
- **Option B:** Extend `POST /sessions` — if rootContext in body, create session + call handleRootContext, return context + activatedNeurons
- **Option C:** New endpoint `POST /sessions/:id/context` — generic context (new_task, files), calls handleContext/handleNewTask

Requires session store (createSessionContext, getSessionContext). context-handler uses in-memory sessions Map.

## Files

- [sessions.routes.ts](../a2a-server/src/routes/sessions.routes.ts)
- [context-handler.ts](../a2a-server/src/knowledge/context-handler.ts)

## Dependencies

- Session must exist before handleRootContext (sessionId)
- createSessionContext(sessionId, projectId) — projectId from session.projectId

## Reference

[entry-points.md](../a2a-server/docs/entry-points.md) § Flow: Первое сообщение

## Verification

POST /sessions/:id/root-context with rootContext. Response includes context, activatedNeurons, injectedContent.

## Prev / Next

— | —
