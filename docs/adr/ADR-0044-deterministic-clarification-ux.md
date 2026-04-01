# ADR-0044: Deterministic Clarification UX

## Status
**Proposed**  
**Date**: 2026-04-01  

## Context & Problem Statement
When ambiguity occurs or context is truncated, conversational drift dilutes the agent's memory. Instead of a free-form chat, the agent should ask one precise question.

## Decision
1. Implement **Clarification Mode** — a single-question, single-answer UI flow triggered when ambiguity is high.
2. Introduce `context_truncated` flag in `MEMORY_INFLUENCE`. If true, the agent *must* trigger Clarification Mode or emit an explicit Warning, refusing to hallucinate on partial context.

---
