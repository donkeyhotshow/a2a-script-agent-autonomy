# normalize-env

Инвентаризировать переменные окружения из .env файла (без секретов).

**Priority:** 20

**Project:** Laravel (laravel-agent-workspace-tools)

## Sub-actions (1 step)

### 1. extract-env-keys

Извлечь имена переменных из .env файла.

**Input:** none  
**Output:** env_keys[]

```typescript
import fs from 'node:fs';

interface EnvKey {
  key: string;
  has_value: boolean;
}

export default async function run(input: { envPath: string }): Promise<{ env_keys: EnvKey[] }> {
  const { envPath } = input;
  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');
  const env_keys: EnvKey[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      env_keys.push({
        key: match[1].trim(),
        has_value: match[2].trim().length > 0
      });
    }
  }

  return { env_keys };
}
```

## Context

| Key | Value |
|-----|-------|
| projectType | laravel |
| source | greedy-dump/laravel-agent-workspace-tools |
| syncMode | recommended |
