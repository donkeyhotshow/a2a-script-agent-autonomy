# context-format

Format and serialize context for messages.

## Priority
70

## Triggers
- context format
- format context
- serialize context

## Sub-actions

### 1. context-format-serialize
Serialize context block for protocol message.

**Input:** context  
**Output:** serialized

```typescript
export default async function run(input: { context: unknown }): Promise<{ serialized: string }> {
  return { serialized: JSON.stringify(input.context) };
}
```
