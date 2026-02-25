# fix-vue-imports-batch

Исправить сломанные импорты в Vue файлах с серверной обработкой (батчами). **План:** [fix-vue-imports-batch](../../../plans/later/fix-vue-imports-batch.md).

**План (детали, state machine):** [plans/later/fix-vue-imports-batch.md](../../../../plans/later/fix-vue-imports-batch.md)

## Priority
90

## Context
- Framework: Vue 3
- Build tool: Vite
- Processing: Batch mode with server-side logic. Phase: init | detect | resolve | apply | completed

## Triggers
- batch fix vue imports
- server-side vue import fix
- fix vue imports batch

## Sub-actions

### 1. batch-init
Инициализация: загрузка конфигурации (vite.config, aliases). Condition: context.phase === undefined | 'init'.

**Input:** rootDir  
**Output:** request_files?, context.aliases, phase=detect

```typescript
export default async function run(input: { rootDir: string }): Promise<{
  request_files?: string[];
  context: { phase: string; aliases?: Record<string, string> };
}> {
  return {
    request_files: ['vite.config.ts', 'vite.config.js', 'tsconfig.json'],
    context: { phase: 'init' },
  };
}
```

### 2. batch-detect
Обнаружение сломанных импортов — батч по 10 файлов. Condition: context.phase === 'detect'.

**Input:** rootDir, context.aliases, context.batchIndex  
**Output:** broken_imports[], context.phase=resolve, context.hasMore

```typescript
interface BrokenImport { file: string; line: number; specifier: string; }

export default async function run(input: {
  rootDir: string;
  context?: { aliases?: Record<string, string>; batchIndex?: number };
}): Promise<{
  broken_imports: BrokenImport[];
  context: { phase: string; hasMore: boolean };
}> {
  return {
    broken_imports: [],
    context: { phase: 'resolve', hasMore: false },
  };
}
```

### 3. batch-resolve
Разрешение импортов на сервере. Condition: context.phase === 'resolve'. Client отправляет broken_imports, сервер возвращает patches.

**Input:** broken_imports[], context.aliases  
**Output:** patches[], request_search? (для поиска файлов на клиенте)

```typescript
interface Patch { file: string; line: number; from: string; to: string; }

export default async function run(input: {
  broken_imports: Array<{ file: string; line: number; specifier: string }>;
  context?: { aliases?: Record<string, string> };
}): Promise<{ patches: Patch[] }> {
  return { patches: [] };
}
```

### 4. batch-apply
Применение исправлений. Condition: context.phase === 'apply'. После применения: phase = hasMore ? 'detect' : 'completed'.

**Input:** patches[], context.batchIndex, context.hasMore  
**Output:** fixed_files[], context.phase, context.batchIndex

```typescript
export default async function run(input: {
  patches: Array<{ file: string; line: number; from: string; to: string }>;
  context?: { batchIndex?: number; hasMore?: boolean };
}): Promise<{
  fixed_files: string[];
  context: { phase: string; batchIndex: number };
}> {
  return {
    fixed_files: [],
    context: { phase: 'completed', batchIndex: input.context?.batchIndex ?? 0 },
  };
}
```
