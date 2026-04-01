# ADR-0051: Orchestrator Single State Enum

## Status
**Proposed**  
**Date**: 2026-04-01  

## Context & Problem Statement
Relying on multiple boolean flags (`is_waiting`, `is_running`, `has_error`) creates a "boolean soup" that leads to conflicting state definitions and UI bugs. 

## Decision
Implement a strict **Single State Enum** within `ORCHESTRATOR_CYCLE` for the agent's phase: 
`state: 'IDLE' | 'SCANNING' | 'SYNTHESIZING' | 'ENRICHING' | 'EXECUTING' | 'WAITING_ON_HUMAN' | 'VALIDATING' | 'STOPPED'`.

This directly powers the **Session Status Strip**, replacing abstract "thinking" messages with the explicit systemic phase.


---

<!-- INJECTED FROM V2.0 DOCS -->

# New ADRs: 0052 – 0057

> Архитектурные решения, вытекающие из Architecture Blueprint v2.0.  
> Каждый ADR устраняет конкретный architectural gap выявленный в аудите.  
> **Version:** 1.0 | **Date:** 2026-04-01

---
