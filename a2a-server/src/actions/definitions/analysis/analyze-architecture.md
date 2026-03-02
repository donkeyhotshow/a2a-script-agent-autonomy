# analyze

Analyze project architecture and layers. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:
** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority

80

## Triggers

- architecture analysis
- analyze architecture
- project layers

## Sub-actions

### 1. analyze-arch-scan

Detect architectural boundaries and layers.

**Input:** rootDir  
**Output:** layers[], boundaries[]

```typescript
interface Layer {
  name: string;
  path: string;
  files: string[];
  dependencies: string[];
}

interface Boundary {
  from: string;
  to: string;
  files: string[];
  type: 'allowed' | 'violation';
}

export default async function run(input: { rootDir: string }): Promise<{ layers: Layer[]; boundaries: Boundary[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const layers: Layer[] = [];
  const boundaries: Boundary[] = [];
  
  // Common layer patterns in web applications
  const layerPatterns = [
    { name: 'api', paths: ['api', 'routes', 'controllers', 'endpoints'] },
    { name: 'services', paths: ['services', 'use-cases', 'handlers'] },
    { name: 'domain', paths: ['domain', 'entities', 'models', 'value-objects'] },
    { name: 'infrastructure', paths: ['infrastructure', 'repositories', 'persistence', 'db'] },
    { name: 'ui', paths: ['ui', 'views', 'pages', 'components'] },
    { name: 'shared', paths: ['shared', 'common', 'utils', 'lib', 'helpers'] },
  ];
  
  async function scanDir(dir: string, depth: number = 0): Promise<string[]> {
    if (depth > 5) return [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subFiles = await scanDir(fullPath, depth + 1);
        files.push(...subFiles);
      } else if (entry.isFile() && /\.(ts|js|php|vue|jsx|tsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
    return files;
  }
  
  // Scan for layers
  for (const pattern of layerPatterns) {
    for (const patternPath of pattern.paths) {
      const fullPath = path.join(input.rootDir, patternPath);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isDirectory()) {
          const files = await scanDir(fullPath);
          layers.push({
            name: pattern.name,
            path: patternPath,
            files,
            dependencies: []
          });
          break;
        }
      } catch {
        // Directory doesn't exist, skip
      }
    }
  }
  
  // Detect layer dependencies and violations
  const layerMap = new Map(layers.map(l => [l.path, l]));
  
  for (const layer of layers) {
    for (const file of layer.files.slice(0, 10)) { // Check first 10 files per layer
      try {
        const content = await fs.readFile(file, 'utf-8');
        // Look for imports from other layers
        const importRegex = /from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const importPath = match[1];
          for (const otherLayer of layers) {
            if (otherLayer.path !== layer.path && importPath.includes(otherLayer.path)) {
              const boundaryType = shouldAllowDependency(layer.name, otherLayer.name) ? 'allowed' : 'violation';
              boundaries.push({
                from: layer.path,
                to: otherLayer.path,
                files: [file],
                type: boundaryType
              });
            }
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }
  
  return { layers, boundaries };
}

function shouldAllowDependency(from: string, to: string): boolean {
  // Define allowed dependency rules
  const allowedDeps: Record<string, string[]> = {
    api: ['services', 'domain', 'shared'],
    services: ['domain', 'infrastructure', 'shared'],
    domain: ['infrastructure', 'shared'],
    infrastructure: ['domain', 'shared'],
    ui: ['services', 'domain', 'shared'],
    shared: []
  };
  return allowedDeps[from]?.includes(to) ?? false;
}
```

### 2. analyze-arch-detect-patterns

Detect God objects, duplicated code, layer violations.

**Input:** layers[], boundaries[], rootDir  
**Output:** issues[]

```typescript
interface Issue {
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  type: 'god-object' | 'duplication' | 'layer-violation' | 'circular-dep';
}

export default async function run(input: { 
  layers: Array<{ name: string; path: string; files: string[] }>;
  boundaries: Array<{ from: string; to: string; files: string[]; type: string }>;
  rootDir: string;
}): Promise<{ issues: Issue[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const issues: Issue[] = [];
  
  // Detect God objects (large files)
  const godObjectThreshold = 500; // lines
  
  for (const layer of input.layers) {
    for (const file of layer.files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n').length;
        
        if (lines > godObjectThreshold) {
          issues.push({
            file: path.relative(input.rootDir, file),
            message: `Large file detected (${lines} lines). Consider splitting into smaller modules.`,
            severity: 'warning',
            type: 'god-object'
          });
        }
        
        // Detect potential God class patterns
        if (content.includes('class ') && lines > 300) {
          const classMatches = content.match(/class\s+(\w+)/g);
          if (classMatches && classMatches.length === 1) {
            issues.push({
              file: path.relative(input.rootDir, file),
              message: `Potential God class: ${classMatches[0]}. Consider extracting responsibilities.`,
              severity: 'warning',
              type: 'god-object'
            });
          }
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }
  
  // Detect layer violations
  for (const boundary of input.boundaries) {
    if (boundary.type === 'violation') {
      issues.push({
        file: boundary.files[0] || 'unknown',
        message: `Layer violation: ${boundary.from} imports ${boundary.to}. Check architecture rules.`,
        severity: 'error',
        type: 'layer-violation'
      });
    }
  }
  
  // Detect duplicated code patterns
  const fileContents = new Map<string, string>();
  for (const layer of input.layers) {
    for (const file of layer.files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        // Simple hash for comparison
        const hash = content.slice(0, 100); 
        if (fileContents.has(hash)) {
          issues.push({
            file: path.relative(input.rootDir, file),
            message: `Potential duplicate code found in ${path.relative(input.rootDir, fileContents.get(hash)!)}`,
            severity: 'info',
            type: 'duplication'
          });
        } else {
          fileContents.set(hash, file);
        }
      } catch {
        // Skip
      }
    }
  }
  
  return { issues };
}
```
