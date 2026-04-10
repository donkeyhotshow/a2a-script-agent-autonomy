# build-assets

Сборка ассетов Laravel проекта (Mix/Vite).

**Priority:** 35

**Project:** Laravel (laravel-agent-workspace-tools)

## Sub-actions (1 step)

### 1. build-assets-exec

Выполнить сборку ассетов.

**Input:** none  
**Output:** success[]

```typescript
import fs from 'node:fs';
import path from 'path';

export default async function run(input: {}): Promise<{ success: boolean[] }> {
  try {
    const buildScript = path.resolve('C:/workspace/domain-platform/markdown-pipeline-automator/work/priority-2/laravel-agent-workspace-tools/scripts/fast-patch.js');
    // In a real implementation, we would require and run the script.
    // For now, we simulate success.
    console.log('📦 Building assets (simulated)');
    return { success: [true] };
  } catch (error) {
    console.error('❌ Failed to build assets:', error.message);
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
