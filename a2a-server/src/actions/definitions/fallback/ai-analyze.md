# ai-analyze

Generic AI-based code analysis. Priority: 15.

## Context
```json
{ "type": "analysis", "llm_required": true }
```

## Triggers
- analyze with ai
- ai analysis
- explain code

## Sub-actions

### 1. ai-analyze-context
Gather code context for analysis.

**Input:** target, rootDir?  
**Output:** context

```typescript
export default async function run(input: { target: string; rootDir?: string }): Promise<{ context: unknown }> {
  return { context: {} };
}
```

### 2. ai-analyze-llm
Run analysis via LLM.

**Input:** context, task  
**Output:** findings[]

```typescript
export default async function run(input: { context: unknown; task: string }): Promise<{ findings: unknown[] }> {
  return { findings: [] };
}
```
