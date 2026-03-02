# context-scan

Scan workspace: структура, технологии, зависимости. **План:
** [actions-definitions-for-auto-ai](../../../../docs/actions-definitions-for-auto-ai.md).

## Priority

80

## Context

```json
{ "type": "scan", "requires_file_system": true }
```

## Triggers

- context scan
- scan context
- index files
- собери контекст
- просканируй проект

## Sub-actions

### 1. context-scan-files

Обход проекта и сбор списка файлов с базовой метаинформацией.

**Input:** rootDir, ignore[]  
**Output:** files[]

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface FileInfo {
  path: string;
  size: number;
  extension: string;
  modified: number;
}

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.cache',
  'vendor',
  '*.log',
  '.env'
];

export default async function scanFiles(input: { 
  rootDir: string; 
  ignore?: string[] 
}): Promise<{ files: FileInfo[] }> {
  const ignore = input.ignore || DEFAULT_IGNORE;
  const files: FileInfo[] = [];
  
  function walkDir(dir: string): void {
    if (ignore.some(pattern => {
      if (pattern.startsWith('*.')) {
        return dir.endsWith(pattern.slice(1));
      }
      return dir.includes(pattern);
    })) {
      return;
    }
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const stat = fs.statSync(fullPath);
          files.push({
            path: fullPath,
            size: stat.size,
            extension: path.extname(entry.name),
            modified: stat.mtimeMs
          });
        }
      }
    } catch (err) {
      // Skip inaccessible directories
    }
  }
  
  walkDir(input.rootDir);
  
  return { files };
}
```

### 2. context-scan-detect-tech

Определение структуры, технологий и зависимостей из списка файлов.

**Input:** files[]  
**Output:** structure, technologies[], dependencies

```typescript
interface FileInfo {
  path: string;
  extension: string;
}

interface Structure {
  hasApi: boolean;
  hasModels: boolean;
  hasControllers: boolean;
  hasViews: boolean;
  hasTests: boolean;
  hasConfig: boolean;
}

interface Dependencies {
  npm?: string[];
  composer?: string[];
  pip?: string[];
}

export default async function detectTech(input: { 
  files: FileInfo[] 
}): Promise<{ 
  structure: Structure; 
  technologies: string[];
  dependencies?: Dependencies;
}> {
  const extensions = new Set(input.files.map(f => f.extension));
  const structure: Structure = {
    hasApi: false,
    hasModels: false,
    hasControllers: false,
    hasViews: false,
    hasTests: false,
    hasConfig: false
  };
  
  const technologies: string[] = [];
  
  // Detect technologies by file extensions
  if (extensions.has('.vue')) {
    technologies.push('Vue.js');
    structure.hasViews = true;
  }
  if (extensions.has('.ts') || extensions.has('.tsx')) {
    technologies.push('TypeScript');
  }
  if (extensions.has('.js') || extensions.has('.jsx')) {
    technologies.push('JavaScript');
  }
  if (extensions.has('.py')) {
    technologies.push('Python');
  }
  if (extensions.has('.php')) {
    technologies.push('PHP');
  }
  if (extensions.has('.java')) {
    technologies.push('Java');
  }
  if (extensions.has('.go')) {
    technologies.push('Go');
  }
  if (extensions.has('.rs')) {
    technologies.push('Rust');
  }
  
  // Detect structure by paths
  const paths = input.files.map(f => f.path);
  structure.hasApi = paths.some(p => p.includes('/api/') || p.includes('/routes/'));
  structure.hasModels = paths.some(p => p.includes('/models/') || p.includes('/Model/'));
  structure.hasControllers = paths.some(p => p.includes('/controllers/') || p.includes('/Controller/'));
  structure.hasTests = paths.some(p => p.includes('/tests/') || p.includes('/test/') || p.includes('__tests__'));
  structure.hasConfig = paths.some(p => p.includes('config') || p.endsWith('.config.js') || p.endsWith('.config.ts'));
  
  // Try to detect package.json for dependencies
  const packageJson = input.files.find(f => f.path.endsWith('package.json'));
  let dependencies: Dependencies | undefined;
  
  if (packageJson) {
    try {
      const content = require('fs').readFileSync(packageJson.path, 'utf-8');
      const pkg = JSON.parse(content);
      dependencies = {
        npm: Object.keys(pkg.dependencies || {}),
        dev: Object.keys(pkg.devDependencies || {})
      };
    } catch (e) {
      // Skip invalid package.json
    }
  }
  
  return { structure, technologies, dependencies };
}
```

### 3. context-scan-filter-relevant

Фильтрация релевантных файлов для контекста (исключение нерелевантных).

**Input:** files[], focus?  
**Output:** relevantFiles[]

```typescript
interface FileInfo {
  path: string;
  extension: string;
  size: number;
}

const RELEVANT_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte',
  '.py', '.php', '.java', '.go', '.rs', '.rb',
  '.css', '.scss', '.less', '.html', '.htm',
  '.json', '.yaml', '.yml', '.xml', '.toml',
  '.md', '.mdx', '.sql', '.graphql'
];

const IRRELEVANT_PATTERNS = [
  'node_modules', '.git', 'dist', 'build', '.cache',
  'vendor', 'coverage', '.next', '.nuxt', '.svelte-kit',
  '__pycache__', '.pytest_cache', 'vendor/bundle'
];

export default async function filterRelevant(input: { 
  files: FileInfo[];
  focus?: string;
}): Promise<{ relevantFiles: FileInfo[] }> {
  const relevantFiles = input.files.filter(file => {
    // Check extension
    if (!RELEVANT_EXTENSIONS.includes(file.extension)) {
      return false;
    }
    
    // Check patterns to ignore
    if (IRRELEVANT_PATTERNS.some(pattern => file.path.includes(pattern))) {
      return false;
    }
    
    // Check size limit (skip files > 1MB)
    if (file.size > 1024 * 1024) {
      return false;
    }
    
    // If focus specified, prioritize matching files
    if (input.focus) {
      const focusLower = input.focus.toLowerCase();
      if (file.path.toLowerCase().includes(focusLower)) {
        return true;
      }
    }
    
    return true;
  });
  
  return { relevantFiles };
}
```
