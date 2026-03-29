# batch-generate-patches

Generates patches for Vue components based on migration inventory (mirrors the `batch-generate-patches.js` script).

**Priority:** 7

## Sub-actions (2 steps)

### 1. validate-input

Validates that the project root exists and contains the migration inventory.

**Input:** `{ projectRoot: string }`  
**Output:** `{ inventoryPath: string }`

```typescript
import fs from 'fs/promises';
import path from 'path';

export default async function run(input: { projectRoot: string }): Promise<{ inventoryPath: string }> {
  const { projectRoot } = input;
  const inventoryPath = path.join(projectRoot, 'migration-inventory.json');
  
  try {
    await fs.access(projectRoot);
    await fs.access(inventoryPath);
    return { inventoryPath };
  } catch (error) {
    throw new Error(`Invalid project root or missing migration inventory: ${error.message}`);
  }
}
```

### 2. execute-batch-generate

Runs the batch patch generation script in the context of the project root.

**Input:** `{ inventoryPath: string, projectRoot: string }`  
**Output:** `{ stdout: string; stderr: string; exitCode: number }` (from `execute-command`)

```typescript
export default function run(input: { inventoryPath: string; projectRoot: string }): Promise<{ command: string; args: string[]; options: { cwd: string; env: NodeJS.ProcessEnv } }> {
  const { projectRoot } = input;
  
  // Path to the copied script within a2a-server
  const scriptPath = path.join(__dirname, '..', '..', '..', 'scripts', 'batch-generate-patches.js');
  
  return Promise.resolve({
    command: 'node',
    args: [scriptPath],
    options: {
      cwd: projectRoot,
      env: {
        ...process.env,
        // Ensure we use the same model as the original script
        OPENROUTER_MODEL: 'stepfun/step-3.5-flash:free'
      }
    }
  });
}
```

## Context

- Framework: Laravel (specifically for Vue component migration)
- Assumes the Laravel agent workspace tools are available in the project environment
- Requires `migration-inventory.json` in the project root
- Uses OpenRouter API with model `stepfun/step-3.5-flash:free` for patch generation

## Triggers

- batch generate patches
- migrate vue components
- generate migration patches