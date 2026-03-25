# T006 — Document runtime session files vs sync pipeline names

**Golden:** Eight-file pipeline uses `request.json`, `response.json`, `client.json`, `received.json` per step ([`simulations/SCHEMA.md`](../simulations/SCHEMA.md)).

**Runtime:** [`AGENTS.md`](../AGENTS.md) Session Storage — `client-result.json`, `request-to-server.json`, `server-response.json`, etc.

**Goal:** No code rename required in this task unless product agrees. Deliver a short mapping table (comment in `session-store.js` or `docs/`) so engineers do not confuse **golden filenames** with **on-disk session filenames**.

**Acceptance:**
- One-page mapping: simulation file → runtime file → purpose.
- Link from README or existing WEB_UI doc if appropriate (only if you already edit that doc for another reason).
