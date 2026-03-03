# A2A Action Schemas

JSON Schema definitions for A2A action types and validation.

## Files

| File | Description |
|------|-------------|
| `action-definition.schema.json` | Schema for action definitions (YAML format) |
| `action-types.schema.json` | Schema for execute action types (form, script, rag-search, etc.) |

## Usage

### Validate YAML Action Definitions

```javascript
import Ajv from 'ajv';
import actionDefSchema from './action-definition.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(actionDefSchema);

const isValid = validate(yamlActionDefinition);
if (!isValid) {
  console.error(validate.errors);
}
```

### TypeScript Type Generation

```bash
# Generate types from YAML definitions
npm run generate:types
```

This creates:
- `a2a-server/src/actions/generated-types.ts` - Server types with Zod schemas
- `a2a-client/packages/types/src/action-types.ts` - Client types

## Action Types

All execute actions use **action-key shape**:

```json
// ✅ Correct
{
  "execute": {
    "read-file": { "path": "src/auth.js" }
  }
}

// ❌ Incorrect
{
  "execute": {
    "action": "read-file",
    "file": "src/auth.js"
  }
}
```

### Supported Action Types

| Type | Description | Client | UI |
|------|-------------|--------|-----|
| `form` | Interactive form with choices/input | ❌ | ✅ |
| `message` | Display message | ❌ | ✅ |
| `script` | Execute JavaScript | ✅ | ❌ |
| `rag-search` | RAG search | ✅ | ❌ |
| `read-file` | Read file contents | ✅ | ❌ |
| `write-file` | Write file contents | ✅ | ❌ |
| `execute-command` | Execute shell command | ✅ | ❌ |

## Schema Structure

### Action Definition

```yaml
id: my-action
version: "1.0"
title: "My Action"
description: "Action description"
triggers:
  - keyword1
  - keyword2
context:
  framework: vue
  buildTool: vite
mixins:
  - file-collector
steps:
  - id: step1
    description: "Step description"
    script: |
      export default async function run(input) {
        return { result: "done" };
      }
    input:
      param: "value"
    output: result
```

## Integration

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Regenerate types if YAML files changed
if git diff --cached --name-only | grep -q "yaml"; then
  npm run generate:types
  git add a2a-server/src/actions/generated-types.ts
  git add a2a-client/packages/types/src/action-types.ts
fi
```

### CI/CD Validation

```yaml
# .github/workflows/validate.yml
- name: Validate Action Schemas
  run: |
    npm run generate:types
    git diff --exit-code || (echo "Types are out of date. Run 'npm run generate:types' and commit." && exit 1)
```

## Design Principles

1. **Single Source of Truth** - YAML definitions generate all types
2. **Action-Key Shape** - All results/execute use `{ [actionType]: params }`
3. **Runtime Validation** - Zod schemas validate at runtime
4. **Type Safety** - Full TypeScript support
5. **Sync Between Components** - Same types on server/client
