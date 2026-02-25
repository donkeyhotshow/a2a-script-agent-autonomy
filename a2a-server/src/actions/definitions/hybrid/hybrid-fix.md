# hybrid-fix

Исправление проблем: Analyze → AI → Validate → Apply. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [5-hybrid](../../../../docs/use-cases/auto-ai/5-hybrid.md).

## Priority
85

## Triggers
- hybrid fix
- fix with analysis
- analyze and fix
- исправь n+1
- почини ошибку

## Sub-actions

### 1. hybrid-collect
Сбор контекста (RAG + Graph).

**Input:** target, rootDir?  
**Output:** context

```typescript
export default async function run(input: { target: string; rootDir?: string }): Promise<{ context: unknown }> {
  return { context: {} };
}
```

### 2. hybrid-prompt
Формирование промпта для AI.

**Input:** target, context  
**Output:** prompt

```typescript
export default async function run(input: { target: string; context: unknown }): Promise<{ prompt: string }> {
  return { prompt: input.target };
}
```

### 3. hybrid-analyze
Вызов AI для предложений исправлений.

**Input:** prompt  
**Output:** raw_response

```typescript
export default async function run(input: { prompt: string }): Promise<{ raw_response: string }> {
  return { raw_response: '' };
}
```

### 4. hybrid-parse
Парсинг ответа AI (блоки кода, патчи).

**Input:** raw_response  
**Output:** patches[]

```typescript
export default async function run(input: { raw_response: string }): Promise<{ patches: unknown[] }> {
  return { patches: [] };
}
```

### 5. hybrid-validate
Валидация изменений (синтаксис, линт).

**Input:** patches[]  
**Output:** valid_patches[], errors[]

```typescript
export default async function run(input: { patches: unknown[] }): Promise<{ valid_patches: unknown[]; errors: string[] }> {
  return { valid_patches: input.patches, errors: [] };
}
```

### 6. hybrid-preview
Превью для пользователя (diff).

**Input:** valid_patches[]  
**Output:** preview

```typescript
export default async function run(input: { valid_patches: unknown[] }): Promise<{ preview: string }> {
  return { preview: '' };
}
```

### 7. hybrid-apply
Применение с подтверждением.

**Input:** valid_patches[], confirm?  
**Output:** applied[]

```typescript
export default async function run(input: { valid_patches: unknown[]; confirm?: boolean }): Promise<{ applied: string[] }> {
  return { applied: [] };
}
```

### 8. hybrid-rollback
Откат при ошибках.

**Input:** applied[], backup  
**Output:** rolled_back

```typescript
export default async function run(input: { applied: string[]; backup: unknown }): Promise<{ rolled_back: boolean }> {
  return { rolled_back: false };
}
```
