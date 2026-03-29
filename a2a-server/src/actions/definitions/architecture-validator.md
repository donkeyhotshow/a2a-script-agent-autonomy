# architecture-validator

Validates architectural dependency rules between layers in a Laravel project (mirrors the `architecture-validator.js` script).

**Priority:** 8

## Sub-actions (3 steps)

### 1. load-config

Loads the architecture configuration from a JSON file.

**Input:** `{ configPath?: string, rootDir: string }`  
**Output:** `{ config: object }`

```typescript
import fs from 'fs/promises';
import path from 'path';

export default async function run(input: { configPath?: string; rootDir: string }): Promise<{ config: any }> {
  const configPath = input.configPath || path.join(input.rootDir, 'config', 'architecture-rules.json');
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    return { config };
  } catch (error) {
    throw new Error(`Failed to load architecture config from ${configPath}: ${error.message}`);
  }
}
```

### 2. validate-files

Analyzes all JavaScript and TypeScript files in the src directory for architectural violations.

**Input:** `{ config: object, rootDir: string }`  
**Output:** `{ violations: Array<{ file: string; import: string; fromLayer: string; toLayer: string; rule: string }> }`

```typescript
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function run(input: { config: any; rootDir: string }): Promise<{ violations: Array<{ file: string; import: string; fromLayer: string; toLayer: string; rule: string }> }> {
  const { config, rootDir } = input;
  const violations: Array<{ file: string; import: string; fromLayer: string; toLayer: string; rule: string }> = [];

  // Helper to determine layer for a given file path
  const getLayerForPath = (filePath: string): string | null => {
    const relativePath = path.relative(rootDir, filePath);
    for (const [layerName, layerConfig] of Object.entries(config.layers)) {
      for (const pathPattern of layerConfig.paths) {
        // Simple pattern matching - convert glob-like pattern to regex
        const regex = new RegExp(pathPattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        if (regex.test(relativePath)) {
          return layerName;
        }
      }
    }
    return null;
  };

  // Helper to check if import from one layer to another is allowed
  const isAllowedImport = (fromLayer: string, toLayer: string): boolean => {
    const rules = config.dependencyRules[fromLayer];
    if (!rules) return false;
    if (rules.cannotImport?.includes(toLayer)) return false;
    if (rules.canImport?.includes(toLayer)) return true;
    return false;
  };

  const srcDir = path.join(rootDir, 'src');
  try {
    const files = await glob('**/*.{js,ts,mjs,mts}', { cwd: srcDir, absolute: true });

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const fromLayer = getLayerForPath(filePath);
        if (!fromLayer) continue;

        // Extract import statements
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          let resolvedPath: string | null = null;

          // Resolve relative imports
          if (importPath.startsWith('.')) {
            resolvedPath = path.resolve(path.dirname(filePath), importPath);
          } else {
            // For absolute imports, try to resolve from src/
            resolvedPath = path.resolve(srcDir, importPath);
          }

          // Try to find the actual file with common extensions
          const possibleExtensions = ['.js', '.ts', '.mjs', '.mts', '/index.js', '/index.ts'];
          let actualPath: string | null = null;
          for (const ext of possibleExtensions) {
            try {
              const testPath = resolvedPath + ext;
              await fs.access(testPath);
              actualPath = testPath;
              break;
            } catch {
              // Continue checking
            }
          }

          if (!actualPath) {
            // Try as directory with index.js
            try {
              const indexPath = path.join(resolvedPath, 'index.js');
              await fs.access(indexPath);
              actualPath = indexPath;
            } catch {
              // Import might be from node_modules or external, skip
              continue;
            }
          }

          const toLayer = getLayerForPath(actualPath);
          if (toLayer && !isAllowedImport(fromLayer, toLayer)) {
            violations.push({
              file: filePath,
              import: importPath,
              fromLayer,
              toLayer,
              rule: `Layer '${fromLayer}' cannot import from '${toLayer}'`
            });
          }
        }
      } catch (error) {
        console.error(`Error analyzing ${filePath}: ${error.message}`);
      }
    }
  } catch (error) {
    throw new Error(`Failed to scan source directory: ${error.message}`);
  }

  return { violations };
}
```

### 3. print-results

Prints validation results and returns success status.

**Input:** `{ violations: Array<{ file: string; import: string; fromLayer: string; toLayer: string; rule: string }> }`  
**Output:** `{ success: boolean }`

```typescript
export default function run(input: { violations: Array<{ file: string; import: string; fromLayer: string; toLayer: string; rule: string }> }): Promise<{ success: boolean }> {
  const { violations } = input;
  if (violations.length === 0) {
    console.log('✅ Architecture validation passed! No violations found.');
    return Promise.resolve({ success: true });
  }

  console.log(`❌ Found ${violations.length} architecture violations:`);
  console.log('');
  violations.forEach((violation, index) => {
    console.log(`${index + 1}. ${violation.file}`);
    console.log(`   Import: ${violation.import}`);
    console.log(`   Violation: ${violation.rule}`);
    console.log(`   From: ${violation.fromLayer} → To: ${violation.toLayer}`);
    console.log('');
  });
  return Promise.resolve({ success: false });
}
```

## Context

- Framework: Laravel
- Assumes standard Laravel project structure with `src` directory containing source code
- Configuration file: `config/architecture-rules.json` (relative to project root)
- Layers and dependency rules are defined in the configuration

## Triggers

- validate architecture
- check layer dependencies
- architectural linting