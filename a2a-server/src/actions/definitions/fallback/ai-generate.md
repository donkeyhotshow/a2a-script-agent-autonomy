# ai-generate

Generic AI-based code generation. Priority: 15.

## Context
```json
{ "type": "generation", "llm_required": true }
```

## Triggers
- generate with ai
- ai generate
- create with ai

## Sub-actions

### 1. ai-generate-prompt
Build generation prompt from task and context.

**Input:** task, context?  
**Output:** prompt

```typescript
export default async function run(input: { task: string; context?: unknown }): Promise<{ prompt: string }> {
  return { prompt: input.task };
}
```

### 2. ai-generate-llm
Call LLM for code generation.

**Input:** prompt  
**Output:** draft, diff?

```typescript
export default async function run(input: { prompt: string }): Promise<{ draft: string; diff?: string }> {
  return { draft: '' };
}
```
