# analyze-performance

Анализ производительности: N+1, missing indexes, memory leaks. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
80

## Context
```json
{ "category": "performance", "severity": "warning" }
```

## Triggers
- performance analysis
- analyze performance
- bottlenecks
- n+1
- performance check

## Sub-actions

### 1. perf-collect
Сбор файлов для анализа.

**Input:** rootDir  
**Output:** files[]

```typescript
export default async function run(input: { rootDir: string }): Promise<{ files: string[] }> {
  // const files = collectFiles(input.rootDir, ['.php', '.js', '.ts']);
  return { files: [] };
}
```

### 2. perf-detect-n1
Обнаружение N+1 запросов (Laravel/Eloquent и т.п.).

**Input:** files[]  
**Output:** n1_findings[]

```typescript
export default async function run(input: { files: string[] }): Promise<{ n1_findings: Array<{ file: string; line: number; message: string }> }> {
  const findings: Array<{ file: string; line: number; message: string }> = [];
  // Паттерны N+1 в циклах с запросами
  return { n1_findings: findings };
}
```

### 3. perf-detect-missing-indexes
Обнаружение отсутствующих индексов (миграции, запросы).

**Input:** files[]  
**Output:** index_findings[]

```typescript
export default async function run(input: { files: string[] }): Promise<{ index_findings: Array<{ file: string; column: string; message: string }> }> {
  return { index_findings: [] };
}
```
