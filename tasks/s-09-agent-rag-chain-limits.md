# S-09: Agent RAG Chain Limits

## Problem
Need safe defaults for A2A_AGENT_RAG_CHAIN_MAX and project path envs, with verified fallback behavior.

## Solution
1. Set default A2A_AGENT_RAG_CHAIN_MAX=5
2. Add A2A_RAG_PROJECT_PATH environment variable
3. Verify fallback when env vars are missing

## Where
- File: `a2a-server/src/services/rag/agent-rag-chain.ts`
- Config: `.env.example`

## Implementation
```typescript
// In agent-rag-chain.ts
const DEFAULT_MAX_CHAIN = parseInt(process.env.A2A_AGENT_RAG_CHAIN_MAX || '5');
const MAX_CHAIN_LIMIT = 20; // Hard cap

export class AgentRagChain {
  private maxChain: number;
  
  constructor() {
    this.maxChain = Math.min(DEFAULT_MAX_CHAIN, MAX_CHAIN_LIMIT);
  }
  
  async run(ctx: Context): Promise<RagResult> {
    const projectPath = process.env.A2A_RAG_PROJECT_PATH;
    if (!projectPath) {
      logger.warn('A2A_RAG_PROJECT_PATH not set, skipping RAG');
      return { results: [] };
    }
    // ... rest of implementation
  }
}
```

## Verification
```bash
# Test with custom limit
A2A_AGENT_RAG_CHAIN_MAX=10 curl http://localhost:3000/api/v1/invoke

# Test without env (should use default)
curl http://localhost:3000/api/v1/invoke
```
