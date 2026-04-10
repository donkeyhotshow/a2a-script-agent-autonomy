# Server Transform Runtime

Runtime module that reads and applies JSON transform configurations following the Transform DSL specification.

## Usage

```typescript
import { runTransformPipeline, loadTransformPipeline } from '@/transform/pipeline.js';

// Load pipeline from file
const pipeline = await loadTransformPipeline('path/to/server-transforms.json');

// Run transform
const result = await runTransformPipeline(pipeline, input, { 
  baseDir: 'path/to/files' // used for file operations like parse-json-from-md
});

if (result.success) {
  console.log('Transformation successful:', result.output);
} else {
  console.error('Transformation failed:', result.error);
}
```

## Operations

### 1. copy
Copies value from one JSONPath to another.

```json
{
  "op": "copy",
  "from": "$.source.path",
  "to": "$.destination.path"
}
```

### 2. set
Sets value at specified JSONPath. Value can be a template string with JSONPath placeholders.

```json
{
  "op": "set",
  "path": "$.target.path",
  "value": {
    "key": "$.source.value"
  }
}
```

### 3. append-to-array
Appends value to array at specified JSONPath.

```json
{
  "op": "append-to-array",
  "to": "$.target.array",
  "value": {
    "key": "value"
  }
}
```

### 4. parse-json-from-md
Parses JSON from markdown file and places it at JSONPath.

```json
{
  "op": "parse-json-from-md",
  "fromFile": "response.md",
  "jsonPath": "$",
  "to": "$.llm"
}
```

### 5. render-markdown
Renders markdown from template file using data context.

```json
{
  "op": "render-markdown",
  "templateRef": "simulations/agent-coder/3/request.md",
  "data": "$",
  "outputFile": "request.md"
}
```

### 6. switch
Conditional execution based on discriminator value.

```json
{
  "op": "switch",
  "discriminator": "$.llm.action",
  "cases": {
    "rag-search": {
      "op": "set",
      "path": "$.execute",
      "value": {
        "rag-search": {
          "query": "$.llm.params.query"
        }
      }
    }
  }
}
```

## Error Handling

All operations include robust error handling with detailed messages. If any step fails:

```typescript
{
  success: false,
  error: {
    message: "Transformation failed: ENOENT: no such file or directory, open '…\\simulations\\agent-coder\\3\\response.md'",
    details: ... // additional context
  }
}
```

## Testing

```bash
cd a2a-server && npx vitest run tests/transform-runtime.test.ts
```

Test file covers:
- All 6 operations
- Template resolution
- File IO operations
- Error handling
- Integration with `agent-coder/3` simulation

## Architecture

```
├── a2a-server/src/transform/
│   ├── types.ts          # TypeScript types and definitions
│   ├── jsonpath.ts       # JSONPath utilities
│   ├── operations.ts     # Operation implementations
│   └── pipeline.ts       # Main pipeline orchestration
└── a2a-server/tests/
    └── transform-runtime.test.ts # Comprehensive tests