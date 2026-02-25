# analyze-full

Полный анализ проекта: запуск всех активных нейронов. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
80

## Triggers
- full analysis
- analyze project
- project analysis
- проанализируй проект
- найди проблемы

## Sub-actions

### 1. analyze-collect
Сбор файлов для анализа.

**Input:** rootDir  
**Output:** files[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ files: string[] }> {
  return { files: [] };
}
```

### 2. analyze-detect
Запуск детекторов (нейроны, паттерны).

**Input:** files[]  
**Output:** raw_findings[]

```typescript
export default async function run(input: { files: string[] }): Promise<{ raw_findings: unknown[] }> {
  return { raw_findings: [] };
}
```

### 3. analyze-aggregate
Агрегация результатов по файлам/типам.

**Input:** raw_findings[]  
**Output:** aggregated

```typescript
export default async function run(input: { raw_findings: unknown[] }): Promise<{ aggregated: unknown }> {
  return { aggregated: {} };
}
```

### 4. analyze-prioritize
Приоритизация по критичности.

**Input:** aggregated  
**Output:** prioritized[]

```typescript
export default async function run(input: { aggregated: unknown }): Promise<{ prioritized: unknown[] }> {
  return { prioritized: [] };
}
```

### 5. analyze-report
Формирование отчёта.

**Input:** prioritized[]  
**Output:** report

```typescript
export default async function run(input: { prioritized: unknown[] }): Promise<{ report: string }> {
  return { report: '' };
}
```
