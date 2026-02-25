# generate-crud

Генерация CRUD: модель, контроллер, миграция. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [4-code-generation](../../../../docs/use-cases/auto-ai/4-code-generation.md).

## Priority
80

## Triggers
- generate crud
- crud generation
- create crud
- создай контроллер
- сгенерируй модель

## Sub-actions

### 1. generate-analyze
Анализ задачи пользователя (ресурс, поля).

**Input:** task  
**Output:** spec

```typescript
export default async function run(input: { task: string }): Promise<{ spec: { resourceName: string; fields?: unknown[] } }> {
  return { spec: { resourceName: '' } };
}
```

### 2. generate-context
Сбор контекста (стиль проекта, существующие модели).

**Input:** spec, rootDir?  
**Output:** context

```typescript
export default async function run(input: { spec: unknown; rootDir?: string }): Promise<{ context: unknown }> {
  return { context: {} };
}
```

### 3. generate-llm
Вызов LLM для генерации кода.

**Input:** spec, context  
**Output:** drafts

```typescript
export default async function run(input: { spec: unknown; context: unknown }): Promise<{ drafts: Record<string, string> }> {
  return { drafts: {} };
}
```

### 4. generate-validate
Валидация синтаксиса сгенерированного кода.

**Input:** drafts  
**Output:** valid_drafts, errors[]

```typescript
export default async function run(input: { drafts: Record<string, string> }): Promise<{ valid_drafts: Record<string, string>; errors: string[] }> {
  return { valid_drafts: input.drafts, errors: [] };
}
```

### 5. generate-diff
Формирование diff для превью.

**Input:** valid_drafts  
**Output:** diff[]

```typescript
export default async function run(input: { valid_drafts: Record<string, string> }): Promise<{ diff: Array<{ path: string; patch: string }> }> {
  return { diff: [] };
}
```

### 6. generate-apply
Применение изменений (опционально, с подтверждением).

**Input:** diff[], confirm?  
**Output:** createdFiles[]

```typescript
export default async function run(input: { diff: unknown[]; confirm?: boolean }): Promise<{ createdFiles: string[] }> {
  return { createdFiles: [] };
}
```
