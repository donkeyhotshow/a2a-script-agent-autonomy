# context-format

Форматирование контекста: упаковка для AI. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md) (use-case 1-context-collection).

## Priority
70

## Triggers
- context format
- format context
- serialize context
- подготовь контекст для анализа

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

### 2. context-format-pack
Упаковка контекста для внешнего AI (структура для Claude/GPT).

**Input:** serialized, maxTokens?  
**Output:** packed (snippets, file list, graph hints)

```typescript
export default async function run(input: { serialized: string; maxTokens?: number }): Promise<{ packed: unknown }> {
  return { packed: {} };
}
```
