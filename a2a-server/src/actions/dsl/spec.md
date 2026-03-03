# DSL Specification for Action Definitions

> **Реализация на основе плана: plans/pivots/pivot-3-dsl-composability.md**
>
> YAML-based Domain-Specific Language for defining actions with composition, mixins, and inheritance.

## File Structure

```
actions/
├── definitions/
│   ├── yaml/
│   │   ├── actions/     # Action definitions
│   │   │   └── fix-vue-imports.yaml
│   │   ├── mixins/      # Reusable components
│   │   │   ├── file-collector.yaml
│   │   │   ├── patch-applier.yaml
│   │   │   └── code-analyzer.yaml
│   │   └── base/        # Base templates
│   │       └── base-fix.yaml
│   └── md/              # Legacy MD definitions (fallback)
```

## Action Schema

```yaml
# actions/fix-vue-imports.yaml
id: fix-vue-imports        # Unique identifier
version: 1.0               # Version number
extends: base-fix          # Optional: extend base template

# Optional: include mixins
mixins:
  - file-collector        # Mixin name (without .yaml)
  - patch-applier

# Context requirements
context:
  framework: vue
  build-tool: vite

# Optional: framework-specific variants
variants:
  - framework: react
    mixins:
      - react-file-collector
  - framework: vue
    mixins:
      - vue-file-collector

# Triggers for semantic search
triggers:
  - fix vue imports
  - resolve import issues
  - broken imports

# Steps execution pipeline
steps:
  - id: step-1-id
    description: "What this step does"
    
    # Option 1: Use mixin
    $mixin: code-analyzer
    # Override mixin inputs
    pattern: "custom-pattern"
    extensions: ['.vue']
    output: step1_result
    
  - id: step-2-id
    description: "Custom script"
    
    # Option 2: Inline TypeScript
    script: |
      export default async function run(input: { step1_result: any }) {
        // TypeScript code
        return { processed: input.step1_result };
      }
    input:
      step1_result: "{{ step1_result }}"
    output: step2_result
    
  - id: step-3-id
    $mixin: patch-applier
    input:
      patches: "{{ step2_result }}"
```

## Mixin Schema

```yaml
# mixins/file-collector.yaml
mixin: file-collector
description: "Collect files by extensions"

# Default inputs (can be overridden)
input:
  rootDir: string
  extensions: string[]
  exclude?: string[]

# Outputs
output:
  files: string[]
  
# Default implementation (can be overridden)
script: |
  // Default TypeScript implementation
  export default async function run(input: {
    rootDir: string;
    extensions: string[];
    exclude?: string[];
  }): Promise<{ files: string[] }> {
    // Implementation
    return { files: [] };
  }
```

## Base Template Schema

```yaml
# base/base-fix.yaml
base: base-fix
version: 1.0
description: "Base template for fix actions"

# Steps that will be inherited
steps:
  - id: analyze
    $mixin: code-analyzer
    output: analysis_result
    
  - id: apply
    $mixin: patch-applier
    input:
      patches: "{{ analysis_result }}"
```

## Variables and Interpolation

```yaml
# Variable interpolation syntax
input:
  files: "{{ step1.files }}"          # Reference previous step output
  custom_value: "${env.VAR_NAME}"    # Environment variable
  computed: "${step1.count + 1}"     # Simple expressions

# Conditionals
steps:
  - id: conditional-step
    if: "${framework === 'vue'}"
    $mixin: vue-specific-mixin
```

## Validation Rules

| Rule             | Description                      |
|------------------|----------------------------------|
| `id` required    | Every action must have unique id |
| `steps` required | At least one step required       |
| `mixin exists`   | Referenced mixin must exist      |
| `output unique`  | Step output names must be unique |
| `input valid`    | Input references must exist      |
| `no circular`    | No circular mixin dependencies   |

## TypeScript Code in Steps

```yaml
# Inline script
script: |
  import { readFileSync } from 'node:fs';
  
  interface Input {
    files: string[];
  }
  
  interface Output {
    content: Map<string, string>;
  }
  
  export default async function run(input: Input): Promise<Output> {
    const content = new Map<string, string>();
    for (const file of input.files) {
      content.set(file, readFileSync(file, 'utf-8'));
    }
    return { content };
  }
```

## Composition Patterns

### Mixin Composition

Mixins can be composed together to create complex behaviors:

```yaml
# mixins/composite-scanner.yaml
mixin: composite-scanner
mixins:
  - file-collector
  - code-analyzer

description: "Scan and analyze files in one step"

input:
  rootDir: string
  extensions: string[]
  pattern: string

output:
  files: string[]
  matches: array

script: |
  // Composite script that uses both mixins
  export default async function run(input) {
    // Step 1: Collect files (file-collector logic)
    const files = await collectFiles(input.rootDir, input.extensions);
    
    // Step 2: Analyze (code-analyzer logic)
    const matches = await analyzeFiles(files, input.pattern);
    
    return { files, matches };
  }
```

### Inheritance Chain

Actions can extend base templates which themselves extend other templates:

```yaml
# base/base-action.yaml
base: base-action
abstract: true

steps:
  - id: init
    script: |
      export default async function run() {
        return { initialized: true };
      }
    output: init_result

---

# base/base-fix.yaml
base: base-fix
extends: base-action
abstract: true

steps:
  - id: validate
    $mixin: file-validator
    input:
      files: "{{ init_result.files }}"
    output: validation

---

# actions/fix-imports.yaml
id: fix-imports
extends: base-fix

steps:
  - id: fix
    $mixin: patch-applier
    input:
      patches: "{{ validation.patches }}"
```

## Runtime Execution Model

### Step Execution Flow

```
1. Load Action
   ↓
2. Resolve Extends (inheritance)
   ↓
3. Load Mixins
   ↓
4. Validate Structure
   ↓
5. Execute Steps (sequentially)
   ├─ Resolve $mixin → load script
   ├─ Interpolate variables
   ├─ Execute script
   └─ Store output
   ↓
6. Return final output
```

### Variable Scoping

```yaml
steps:
  - id: step1
    $mixin: file-collector
    output: files  # Available: outputs.files
    
  - id: step2
    input:
      # Reference previous output
      data: "{{ step1.files }}"
      # Reference context
      root: "${context.rootDir}"
      # Environment variable
      debug: "${env.DEBUG}"
    output: result  # Available: outputs.result
    
  - id: step3
    input:
      # Chain references
      combined: "{{ step2.result.processed }}"
```

## Error Handling

### Step-level Error Handling

```yaml
steps:
  - id: risky-operation
    $mixin: file-processor
    onError: continue  # Options: stop (default), continue, retry
    retryCount: 3
    
  - id: fallback
    if: "{{ risky-operation.error }}"
    script: |
      export default async function run(input) {
        return { recovered: true };
      }
```

### Global Error Handler

```yaml
id: my-action
errorHandler:
  script: |
    export default async function handleError(error, context) {
      console.error('Action failed:', error);
      return { error: error.message, recovered: false };
    }
```

## Testing DSL Actions

### Unit Test Format

```yaml
# tests/fix-vue-imports.test.yaml
test: fix-vue-imports

cases:
  - name: "detects broken imports"
    setup:
      files:
        "src/component.vue": "import Missing from './missing'"
    input:
      rootDir: "./test-project"
    expect:
      broken_imports:
        - file: "src/component.vue"
          line: 1
          specifier: "./missing"

  - name: "fixes relative paths"
    setup:
      files:
        "src/components/A.vue": "import B from './B'"
        "src/components/B.vue": ""
    input:
      rootDir: "./test-project"
    steps:
      - id: detect
        expect:
          broken_imports: []
```

## DSL API Reference

### DSL Class

```typescript
import {DSL} from './dsl/index.js';

const dsl = new DSL('/path/to/actions');

// Load all mixins
await dsl.loadMixins('/path/to/mixins');

// Parse and resolve an action
const ast = await dsl.parser.parseAction('fix-vue-imports.yaml');
const resolved = dsl.resolver.resolve(ast.data, dsl.getMixins());

// Validate
const result = dsl.validator.validate(ast);
if (!result.valid) {
  console.error(result.errors);
}
```

### Parser Methods

| Method | Description |
|--------|-------------|
| `parseAction(path)` | Parse action YAML file |
| `parseMixin(path)` | Parse mixin YAML file |
| `parseBase(path)` | Parse base template YAML |

### Resolver Methods

| Method | Description |
|--------|-------------|
| `resolve(action, mixins)` | Resolve mixins and variables |
| `resolveStep(step, mixins)` | Resolve single step |
| `resolveExtends(action, loader)` | Resolve inheritance chain |
| `mergeActions(base, child)` | Merge action definitions |

### Validator Methods

| Method | Description |
|--------|-------------|
| `validate(ast)` | Validate AST structure |
| `validateAction(action)` | Validate action only |
| `validateMixin(mixin)` | Validate mixin only |

## Migration Guide

### From TypeScript to YAML

**Before (TypeScript):**
```typescript
// fix-vue-imports.ts
export const action = {
  id: 'fix-vue-imports',
  steps: [
    {
      id: 'collect',
      execute: async (input) => {
        // ... implementation
        return { files };
      }
    }
  ]
};
```

**After (YAML):**
```yaml
id: fix-vue-imports

steps:
  - id: collect
    $mixin: file-collector
    input:
      rootDir: "${context.rootDir}"
    output: files
```

### Gradual Migration Strategy

1. **Phase 1**: Define mixins for common patterns
2. **Phase 2**: Convert simple actions to YAML
3. **Phase 3**: Convert complex actions with scripts
4. **Phase 4**: Remove legacy TypeScript definitions

## Best Practices

1. **Keep mixins focused** - One responsibility per mixin
2. **Use descriptive IDs** - Step IDs should describe the action
3. **Document inputs/outputs** - Always specify types
4. **Version your actions** - Increment version on breaking changes
5. **Test at DSL level** - Write YAML test cases
6. **Prefer composition** - Use mixins over copy-paste

## Version History

| Version | Changes                                    |
|---------|--------------------------------------------|
| 1.0     | Initial spec                               |
| 1.1     | Added composition patterns and error handling |
| 1.2     | Added testing format and migration guide   |
