# Task 006: Replace ChatGPT placeholder

**Index:** [tasks/README.md](README.md) | **Depends:** [005-result-context-block.md](005-result-context-block.md)

---

## Problem

Message: "Request processed (placeholder for ChatGPT)". No external AI call. Tasks, questions, index answers are built but not sent to LLM.

## Solution

When task ready (graph complete or graph_incomplete with question):
1. Build prompt from context (tasks, injected content, questions, index answers)
2. Call external AI (OpenAI, Ollama, etc.)
3. Store response, return to client

## Files

- [request-processor.service.ts](../a2a-server/src/services/request-processor.service.ts)
- New: `a2a-server/src/services/llm.service.ts` (or similar)

## Dependencies

- [005](005-result-context-block.md) — context block format
- Config: API key, model, endpoint

## Verification

POST with full context. Result should include AI-generated response, not placeholder.

## Prev / Next

← [005](005-result-context-block.md) | —
