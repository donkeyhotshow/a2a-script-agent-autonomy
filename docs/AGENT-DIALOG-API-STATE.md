# Agent-mode dialog via Client API — living state

**Purpose:** Ongoing notes for **driving a session in agent pipeline** through **HTTP to the Client API** (same contour as the web UI and Task Monitor). Use this file to record what works, what broke, and contract quirks discovered while scripting or operating `curl`.

**Normative flow (do not diverge without updating this doc):**

1. `POST /api/a2a/sessions` — seed **`mode: "agent"`** (or `execution`) + **`task`**; optional `projectId` / `projectRoot`, `llmModel`.
2. `GET /api/a2a/sessions/{id}` — inspect **`execute.form`**: **no `choices`** → next body is **message**; **has `choices`** → next body is **choice** `id`.
3. `POST /api/a2a/sessions/{id}/next` — body: **`result.message`** / **`result.choice`**, or shorthand **`task`** (string **only** for router choice id or free text per prior step).
4. `GET /api/a2a/sessions/{id}/async` — poll until terminal; re-**GET session** when ambiguous.

**Canonical references:** [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) (driver checklist, create body, sanitization), root [`AGENTS.md`](../AGENTS.md) (*Unified manual path*, *Router dialog*), [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md) (async / messages).

**SDK / alternate host:** same contract; `GET …/sessions/:id?unwrap=1` matches Vite top-level session shape — [`docs/adr/ADR-0028-client-api-deployment-modes.md`](adr/ADR-0028-client-api-deployment-modes.md).

---

## Open risks (cross-check before trusting automation)

Human-review gaps that affect **API-driven** agent dialog are summarized in [`docs/HUMAN-REVIEW-FINDINGS.md`](HUMAN-REVIEW-FINDINGS.md). High-signal items for drivers:

| Area | Risk | Mitigation until fixed |
|------|------|-------------------------|
| `/next` response `execute` | Top-level vs projected `execute` may disagree | Prefer **`GET …/sessions/{id}`** after poll for authoritative projected `execute` |
| `task` shorthand | Numeric JSON `task` fails validation | Always send **string** ids / text |
| Stage while `processing` | Coarse stage may not show **awaiting-async** | Rely on **`GET /async`** + `asyncPending`, not stage alone |
| Envelope `data: null` | Can drop usable `session` in some paths | Re-fetch session; avoid relying on partial envelopes |

---

## Changelog (append newest first)

| Date | Note |
|------|------|
| 2026-04-06 | Doc created. Baseline: two-beat router still possible after create even with `mode: "agent"` — always **GET session** before each `/next` when automating. |

---

## How to maintain

After any **Client API** agent run that surfaces a new invariant, failure mode, or workaround:

1. Add one row under **Changelog** (date + one or two sentences).
2. If it is a **product bug**, also file or update [`docs/HUMAN-REVIEW-FINDINGS.md`](HUMAN-REVIEW-FINDINGS.md) / `tasks/pending/` as appropriate.
3. If the **normative sequence** changes, update the numbered list at the top and [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) in sync.
