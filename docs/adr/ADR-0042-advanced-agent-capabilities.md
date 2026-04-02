# ADR-0042: Advanced Agent Capabilities (MCP, Session Compaction, LSP)

- **Status**: accepted
- **Date**: 2026-04-01
- **Deciders**: Antigravity, USER

## Context

Current A2A agent logic faces three scaling challenges:

1. **Tool Fragility (N² Connectivity)**: Managing a custom interface for every new tool/API leads to high maintenance and inconsistent prompting.
2. **Context Window Bloat**: Long sessions accumulate irrelevant history, increasing costs and reducing precision (the "needle in a haystack" problem).
3. **Shallow Language Understanding**: Agents rely on raw file reads without understanding symbol relationships, leading to errors in complex refactoring.

Inspired by research into `claw-code` (industrial agent harness) and `phpantom_lsp` (high-performance static analysis), we propose a unified approach to these problems.

## Decision

We will integrate three core architectural patterns:

### 1. Model Context Protocol (MCP) Orchestration

Standardize all tool and resource access using the **MCP**. Instead of custom tool definitions, the server will act as an MCP client that can connect to any MCP-compliant server.

### 2. Intelligent Session Compaction (Summarization)

Implement automated history management. When a session reaches a token threshold (e.g., 80% of window), the system will:

- Summarize the "settled" part of the conversation.
- Identify and preserve "Milestone" states (finalized code, user decisions).
- Truncate raw intermediate exchanges.

### 3. LSP-Driven Context Enrichment

Before major coding actions, the agent will query a Language Server (e.g., `phpantom` for PHP) to retrieve precise symbol telemetry (implementations, usages, type information) instead of guessing from file content.

## Implementation Details

### MCP Tool Wrapper (TypeScript)

```typescript
// Shared MCP Client implementation for A2A Server
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function callMcpTool(serverId: string, toolName: string, args: any) {
  const transport = new StdioClientTransport({
    command: "npx",
    args: ["-y", serverId] // e.g. "@modelcontextprotocol/server-google-maps"
  });
  
  const client = new Client({ name: "a2a-agent", version: "1.0.0" }, { capabilities: {} });
  await client.connect(transport);
  
  const result = await client.callTool({ name: toolName, arguments: args });
  return { result: { [toolName]: result } }; // A2A Action-Key Shape
}
```

### Session Compaction Logic (Pseudocode/Python)

```python
def compact_session(history: List[Message], threshold: int):
    tokens = count_tokens(history)
    if tokens < threshold:
        return history

    # Preserve System Prompt and last 3 turns
    fixed_context = history[:1] + history[-6:] 
    to_summarize = history[1:-6]

    summary = llm.summarize(to_summarize, goal="Preserve only project decisions and file state changes")
    
    return history[:1] + [Message(role="system", content=f"PREVIOUS CONTEXT SUMMARY: {summary}")] + history[-6:]
```

### LSP Enrichment Tool (A2A Skill)

```javascript
// action-handler for lsp-query
export async function handleLspQuery({ execute, context }) {
  const { filePath, symbol, queryType } = execute['lsp-query'];
  
  // Example: Using phpantom_lsp analyze
  const { stdout } = await exec(`phpantom_lsp analyze ${filePath} --no-colour`);
  
  return {
    result: {
      "lsp-query": {
        diagnostics: stdout,
        enrichment: `Found symbol ${symbol} at line X with type Y`
      }
    }
  };
}
```

## Consequences

- **Pros**:
  - Reduced token overhead via Compaction.
  - Infinite tool ecosystem via MCP.
  - Professional-grade code analysis via LSP.
- **Cons**:
  - Increased complexity in the server layer.
  - Dependency on external MCP servers and LSP binaries.
- **Follow-ups**:
  - Integrate `phpantom_lsp` binary into the `bin/` directory for immediate PHP support.
  - Implement the Compaction worker in `a2a-server`.

## Related

- [ADR-0036-autonomous-agent-memory-orchestration.md](ADR-0036-autonomous-agent-memory-orchestration.md)
- [ADR-0041-comprehensive-architectural-improvements.md](ADR-0041-comprehensive-architectural-improvements.md)
