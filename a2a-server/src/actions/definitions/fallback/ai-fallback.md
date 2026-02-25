# ai-fallback

Generic LLM handling when no specific action matches. Priority: 10. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md).

## Context
```json
{ "type": "fallback", "llm_required": true }
```

## Triggers
- (any unmatched user task text)

## Sub-actions

### 1. ai-fallback-prompt
Build prompt from task and available context.

**Input:** task, context?  
**Output:** prompt

```typescript
export default async function run(input: { task: string; context?: unknown }): Promise<{ prompt: string }> {
  return { prompt: input.task };
}
```

### 2. ai-fallback-llm
Call external AI with prompt.

**Input:** prompt  
**Output:** response

```typescript
export default async function run(input: { prompt: string }): Promise<{ response: string }> {
  return { response: '' };
}
```

### 3. ai-fallback-respond
Format response for user (message block).

**Input:** response  
**Output:** message

```typescript
export default async function run(input: { response: string }): Promise<{ message: string }> {
  return { message: input.response };
}
```
