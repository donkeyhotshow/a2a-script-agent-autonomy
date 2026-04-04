# ADR-0087: GenAI Bug Fix Pipeline

## Status
Approved

## Context
When tools fail due to logic errors, agents often struggle to fix them in one turn. A specialized bug-fixing pipeline is needed.

## Decision
Implement a three-step bug-fixing tool: `review` (static analysis) → `identify` (finding the root cause) → `patch` (generating the fix). Use high-context LLM calls for this specialized pipeline.

## Consequences
- Higher success rate for complex tool failures.
- Automated recovery from developer-introduced bugs.
