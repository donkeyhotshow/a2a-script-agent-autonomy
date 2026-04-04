# ADR-0078: Unified A2A+MCP Bridge

## Status
Approved

## Context
A2A and MCP (Model Context Protocol) have slightly different tool call formats. Bridging them manually leads to spaghetti code.

## Decision
Implement a unified protocol bridge that translates between A2A `execute` shapes and standard MCP `callTool` shapes.

## Implementation
- `protocol-bridge.ts` service with `unifyA2AMCP` function.

## Consequences
- Seamless integration with the 3rd party MCP ecosystem.
- Cleaner orchestrator code.
