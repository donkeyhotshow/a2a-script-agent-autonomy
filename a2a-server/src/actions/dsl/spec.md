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

| Rule | Description |
|------|-------------|
| `id` required | Every action must have unique id |
| `steps` required | At least one step required |
| `mixin exists` | Referenced mixin must exist |
| `output unique` | Step output names must be unique |
| `input valid` | Input references must exist |
| `no circular` | No circular mixin dependencies |

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

## Version History

| Version | Changes |
|---------|---------|
| 1.0 | Initial spec |
