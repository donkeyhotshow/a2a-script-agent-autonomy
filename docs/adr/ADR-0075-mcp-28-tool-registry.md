# ADR-0075: MCP 28-Tool Registry (cerebro-mcp)

## Status
Approved

## Context
Standard A2A tools are focused on code. Production-ready agents need a broader range of tools: OCR, Web Search, Browser control, etc.

## Decision
Integrate a suite of 28 production tools inspired by `cerebro-mcp`. These tools will be registered automatically in the `Registry-V2` and made available to the agent.

## Implementation
- `a2a-server/registry/cerebro-tools.json` listing the tools.
- `Registry-V2` update to dynamic register these tools on startup.
- Integration with external MCP servers or local implementations.

## Consequences
- Instant 28-tool ecosystem.
- Capability to handle multi-modal tasks (Vision + Search).
