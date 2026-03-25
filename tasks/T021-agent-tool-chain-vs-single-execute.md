# T021 — Agent RAG/tool chain: multiple invokes, single execute each

**Golden:** One protocol action key per server **`response.json`** ([`AGENTS.md`](../AGENTS.md)).

**Code:** [`a2a-client/vite-plugin-a2a/routes/utils/agent-rag-chain.js`](../a2a-client/vite-plugin-a2a/routes/utils/agent-rag-chain.js) runs client tools and **re-invokes** the server up to `A2A_AGENT_RAG_CHAIN_MAX` / `A2A_AGENT_TOOL_CHAIN_MAX`.

**Goal:** Clarify architecture: the **chain** is not a multi-key `execute`; it is a **loop** of single-key responses + client `result` + next `/invoke`. Prevents confusion when debugging “why so many steps.”

**Acceptance:**
- Doc note at top of `agent-rag-chain.js` (already partially there — extend if needed) + pointer in `EXTENDING-LLM-ACTIONS` or tasks README.
