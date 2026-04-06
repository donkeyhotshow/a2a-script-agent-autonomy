# Agent-mode dialog via Client API — living state

**Purpose:** Ongoing notes for **driving a session in agent pipeline** through **HTTP to the Client API** (same contour as the web UI and Task Monitor). Use this file to record what works, what broke, and contract quirks discovered while scripting or operating `curl`.

**Normative flow (do not diverge without updating this doc):**

1. `POST /api/a2a/sessions` — seed **`mode: "agent"`** (or `execution`) + **`task`**; optional `projectId` / `projectRoot`, `llmModel`.
2. `GET /api/a2a/sessions/{id}` — inspect **`execute.form`**: **no `choices`** → next body is **message**; **has `choices`** → next body is **choice** `id`.
3. `POST /api/a2a/sessions/{id}/next` — body: **`result.message`** / **`result.choice`**, or shorthand **`task`** (send **strings** for ids/text; the Client API coerces numeric JSON `task` to string, but operators should still prefer strings).
4. `GET /api/a2a/sessions/{id}/async` — poll until terminal; re-**GET session** when ambiguous.

**Canonical references:** [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) (driver checklist, create body, sanitization), root [`AGENTS.md`](../AGENTS.md) (*Unified manual path*, *Router dialog*), [`a2a-client/docs/WEB_UI_PROTOCOL.md`](../a2a-client/docs/WEB_UI_PROTOCOL.md) (async / messages).

**SDK / alternate host:** same contract; `GET …/sessions/:id?unwrap=1` matches Vite top-level session shape — [`docs/adr/ADR-0028-client-api-deployment-modes.md`](adr/ADR-0028-client-api-deployment-modes.md).

---

## Purple alert — async-only stack (фиолетовая тревога)

**Product rule:** **`POST /api/v1/invoke` has no sync path** — only **`promiseId`** on the POST ack; terminal **`execute` / `context`** via **`GET …/requests/:id/result`**. The Client API mirrors this with **`/next` + `GET …/async`**.

| Do | Do not |
|----|--------|
| **`POST …/next`** then **`GET …/async`** until settled | Expect inline **`execute`** on the POST **`/invoke`** body (except test stubs) |
| Poll server **`/requests/:id/result`** when driving **:3000** directly | Send a **`sync`** field on invoke JSON (schema rejects it as an extra property) |
| Use the driver loop in [`OPERATOR-CURL.md`](OPERATOR-CURL.md) | Treat a single `/next` ack as a finished turn without `/async` |
| After agent **client tool** chains: if **`POST /invoke` returns `promiseId`**, resume via normal **poll** (Vite `chainSyncInvokesForAgentTools` stops there) | Assume chained tool **`POST /invoke`** always returns terminal **`data`** without polling |

---

## Open risks (cross-check before trusting automation)

Recent **human-review** fixes (see [`docs/HUMAN-REVIEW-FINDINGS.md`](HUMAN-REVIEW-FINDINGS.md)): `/next` public `execute` prefers **projected session** when it carries payload; otherwise **top-level** execute is run through **`buildWebExecute`**; **`data.promiseId`** wins over top-level; coarse **stage** maps **pending/processing/waiting** to **`awaiting-async`** when no higher-priority stage applies; numeric **`task`** is coerced to string; **`unwrapEnvelope`** falls back from `data: null` to **`session`**.

| Area | Risk | Mitigation |
|------|------|------------|
| Partial `/next` ack | Handler may return **minimal** `{ success, step, asyncPending }` without full `session` | **`GET …/sessions/{id}`** + **`GET /async`** until the step settles |
| Envelope `data: null` | Bare `data: null` without `session` unwraps to `null` | Re-fetch session; do not assume a partial envelope is complete |
| GLM via ai-integration | `/v1/chat/completions` can return **`choices[0].message.content` empty** while **`usage.completion_tokens_details.reasoning_tokens` > 0** | Hub/model may be “thinking-only” in `content`; server/UI may show no visible assistant line until proxy or prompt path maps reasoning → user-visible text |
| ai-integration stability | Intermittent **`Event loop is closed`** (503) on chat; **`curl /health` can hang** if the process is wedged | Free port **11434** (kill listener PID), then `scripts/start-ai-integration.bat` from repo root (same as `start-all.bat` step). |

---

## Verified operator recipe (Client API + GLM id)

Base URL: **`http://localhost:5173`** (Vite + Client API). Replace `PROJECT_ID` with a real id from **`GET /api/a2a/projects`** (example shape: `p_…`).

1. **Create** (seeds task + model; router may still appear on first real turn):

```http
POST /api/a2a/sessions
Content-Type: application/json

{
  "projectId": "PROJECT_ID",
  "mode": "agent",
  "task": "Reply with exactly one word: OK",
  "llmModel": "glm-4.7-flash"
}
```

2. **First turn** — form has **text field only** → send free text (shorthand **`task`**):

`POST /api/a2a/sessions/{id}/next` with body `{"task":"Reply with exactly one word: OK"}`.

3. **Router** — when `GET …/sessions/{id}` shows **`execute.form.choices`**, send stable id (not the long label), e.g. **`dialog`** (plain chat) or **`agent`** (tools):

`POST …/next` with `{"task":"dialog"}` or `{"task":"agent"}`.

4. **Wait** — poll **`GET …/sessions/{id}/async`** until not pending; re-**GET session** and/or **`GET …/messages?withExecute=1`** for assistant text and `execute`.

**SDK note:** `GET …/sessions/{id}?includeContext=1` may return **`Invalid session ID`** in some builds/environments; use plain **`GET …/sessions/{id}`** for automation unless you confirm production/debug rules.

---

## Stack observations (2026-04-06 live run)

- **Router after seed:** Even with **`mode: "agent"`** or **`mode: "dialog"`**, the first **`/next`** with user text can still produce **`execution.action: "task"` / `step: "router"`** and a large choice list; automation must branch on **`form.choices`** (see step 3 above).
- **Persisted step artifact (mitigated server-side):** Gray room could finish with **context only** and **no `execute`**, which produced context-only **`server-response.json`** (bad for Client API). **`DialogRequestProcessor`** now applies a **dialog fallback `execute.form`** (and appends **`assistant`** to `history` when missing) when the dialog schema would otherwise return an empty/missing execute. Gray room also **resolved** the async loop when an interrupt was skipped for `when` (previously could hang without `resolve`).
- **Hub model name:** In [`ai-integration/config/providers.json`](../ai-integration/config/providers.json), **`qwen3:8b`** maps to **`glm-4.7-flash`**; a chat request body listing `qwen3:8b` may still **complete as `model: "glm-4.7-flash"`** in the JSON response.
- **Direct hub check (optional):** `POST http://localhost:11434/v1/chat/completions` with JSON body `{"model":"glm-4.7-flash","messages":[{"role":"user","content":"…"}],"max_tokens":128}` — use a file body on Windows to avoid shell escaping. If this fails, fix **ai-integration** before debugging Client API session logic.

---

## Changelog (append newest first)

| Date | Note |
|------|------|
| 2026-02-09 | Doc/code follow-up to **async-only** invoke: [`SESSION-SYSTEMS-OVERVIEW.md`](SESSION-SYSTEMS-OVERVIEW.md) diagram + E2E pointers; agent RAG/tool chain comments (stop on **`promiseId`**); e2e-dialog JSDoc. |
| 2026-04-06 | **Removed `sync`** from protocol: A2A **`POST /invoke`** async-only; Client **`/next`** no longer sends `sync`; schema + tests + proba updated. |
| 2026-04-06 | **Purple alert:** documented — **`sync` forbidden** for Client API agent/dialog drivers; async + `/async` poll only ([`OPERATOR-CURL.md`](OPERATOR-CURL.md) cross-link). |
| 2026-04-06 | Human-review checklist **implemented** (client/server/ai-integration); **Open risks** table refreshed; `/next` `execute` projection + numeric `task` + async stage behavior documented in [`HUMAN-REVIEW-FINDINGS.md`](HUMAN-REVIEW-FINDINGS.md). |
| 2026-04-06 | **Server fix:** dialog gray-room results with missing `execute` get fallback form + history assistant; gray-room `interruptWhenSatisfied === false` now calls **`resolve()`** (was `return` only). |
| 2026-04-06 | Live Client API drive: create → `/next` (task) → `/next` (`dialog` or `agent`); router present; **`dialog`** choice ~87s server time; persisted step lacked **`execute`** + no assistant in **messages** (see Stack observations). Hub: GLM completions observed with **empty `message.content`** and **reasoning_tokens**; proxy **503 "Event loop is closed"** / hung health until PID on **11434** cleared and `scripts/start-ai-integration.bat` rerun. |
| 2026-04-06 | Doc created. Baseline: two-beat router still possible after create even with `mode: "agent"` — always **GET session** before each `/next` when automating. |

---

## How to maintain

After any **Client API** agent run that surfaces a new invariant, failure mode, or workaround:

1. Add one row under **Changelog** (date + one or two sentences).
2. If it is a **product bug**, also file or update [`docs/HUMAN-REVIEW-FINDINGS.md`](HUMAN-REVIEW-FINDINGS.md) / `tasks/pending/` as appropriate.
3. If the **normative sequence** changes, update the numbered list at the top and [`docs/OPERATOR-CURL.md`](OPERATOR-CURL.md) in sync.
