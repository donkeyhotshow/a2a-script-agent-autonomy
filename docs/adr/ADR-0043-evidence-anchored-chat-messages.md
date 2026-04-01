# ADR-0043: Evidence-Anchored Chat Messages

## Status
**Proposed**  
**Date**: 2026-04-01  

## Context & Problem Statement
Agent reasoning is currently hidden in Storage or Terminal, making it hard to trust chat messages.

## Decision
Surface **Inline Evidence Chips** that link the agent's chat responses directly to the relevant evidence artifacts (`CONFIDENCE_TRACE`, `TRACE_RISK`, `MEMORY_INFLUENCE`, `DRYRUN_DELTA`).

---
