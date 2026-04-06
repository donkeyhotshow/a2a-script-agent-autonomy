# prepare-deploy

Подготовка Laravel проекта к развертыванию (оптимизация, кэш, миграции).

**Priority:** 40

**Project:** Laravel (laravel-agent-workspace-tools)

## Sub-actions (1 step)

### 1. prepare-deploy-exec

Выполнить подготовку к развертыванию.

**Input:** none  
**Output:** success[]

```typescript
import fs from 'node:fs';
import path from 'path';

export default async function run(input: {}): Promise<{ success: boolean[] }> {
  try {
    // In a real implementation, we would run a series of commands:
    // php artisan optimize
    // php artisan config:cache
    // php artisan route:cache
    // php artisan view:cache
    // etc.
    console.log('🚀 Preparing for deployment (simulated)');
    return { success: [true] };
  } catch (error) {
    console.error('❌ Failed to prepare for deployment:', error.message);
    return { success: [false] };
  }
}
```

## Context

| Key | Value |
|-----|-------|
| projectType | laravel |
| source | greedy-dump/laravel-agent-workspace-tools |
| syncMode | recommended |
