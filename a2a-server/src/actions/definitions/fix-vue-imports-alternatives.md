# fix-vue-imports-alternatives

Resolve Vue imports using alternative paths (aliases, barrel files). Variant of fix-vue-imports. **План:
** [fix-vue-imports-alternatives](../../../docs/archive/fix-vue-imports-alternatives.md).

## Priority

90

## Context

```json
{ "type": "fix", "target": "vue-imports", "method": "alternatives" }
```

## Triggers

- vue import alternatives
- resolve vue aliases
- fix vue imports alternatives
- исправь импорты альтернативы

## Sub-actions

### 1. vue-import-alternatives-detect

Обнаружение импортов, которые могут быть разрешены через алиасы или баррель-файлы.

**Input:** rootDir, aliases?, scanDepth?  
**Output:** candidates[]

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface ImportCandidate {
  file: string;
  line: number;
  specifier: string;
  currentPath: string;
  possiblePaths: string[];
}

interface AliasConfig {
  alias: string;
  resolveTo: string;
}

const DEFAULT_ALIASES: AliasConfig[] = [
  { alias: '@', resolveTo: 'src' },
  { alias: '~', resolveTo: 'src' },
  { alias: '@components', resolveTo: 'src/components' },
  { alias: '@utils', resolveTo: 'src/utils' },
  { alias: '@services', resolveTo: 'src/services' },
  { alias: '@composables', resolveTo: 'src/composables' },
  { alias: '@stores', resolveTo: 'src/stores' },
  { alias: '@types', resolveTo: 'src/types' }
];

const BARREL_FILES = ['index.ts', 'index.js', 'index.vue', 'index.tsx', 'index.jsx'];

export default async function detectAlternatives(input: { 
  rootDir: string;
  aliases?: AliasConfig[];
  scanDepth?: number;
}): Promise<{ candidates: ImportCandidate[] }> {
  const aliases = input.aliases || DEFAULT_ALIASES;
  const scanDepth = input.scanDepth || 3;
  const candidates: ImportCandidate[] = [];
  
  // Find all Vue and TypeScript files
  const vueFiles = findVueFiles(input.rootDir, scanDepth);
  
  for (const file of vueFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      // Parse imports
      const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
      
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        const lineNumber = content.substring(0, match.index).split('\n').length;
        
        // Check if this is an alias import
        const isAliasImport = aliases.some(a => importPath.startsWith(a.alias));
        
        if (isAliasImport) {
          const alias = aliases.find(a => importPath.startsWith(a.alias))!;
          const relativePath = importPath.substring(alias.alias.length);
          
          candidates.push({
            file,
            line: lineNumber,
            specifier: extractSpecifier(content, lineNumber) || 'default',
            currentPath: importPath,
            possiblePaths: generatePossiblePaths(alias, relativePath, path.dirname(file))
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  return { candidates };
}

function findVueFiles(dir: string, depth: number): string[] {
  const files: string[] = [];
  
  if (depth <= 0) return files;
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...findVueFiles(fullPath, depth - 1));
      } else if (entry.isFile() && /\.(vue|ts|tsx|js|jsx)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    // Skip inaccessible directories
  }
  
  return files;
}

function extractSpecifier(content: string, lineNumber: number): string | null {
  const lines = content.split('\n');
  const line = lines[lineNumber - 1];
  
  const match = line.match(/import\s+(?:\{([^}]*)\}|(\w+))/);
  return match ? (match[1] || match[2]) : null;
}

function generatePossiblePaths(alias: AliasConfig, relativePath: string, fromDir: string): string[] {
  const paths: string[] = [];
  
  // Direct alias resolution
  const basePath = path.join(fromDir, alias.resolveTo, relativePath);
  paths.push(basePath);
  
  // With index file (barrel)
  for (const barrel of BARREL_FILES) {
    paths.push(path.join(basePath, barrel));
  }
  
  // Without extension
  const withoutExt = basePath.replace(/\.(ts|js|tsx|jsx|vue)$/, '');
  paths.push(withoutExt);
  
  return paths;
}
```

### 2. vue-import-alternatives-resolve

Разрешение каждого кандидата в лучший путь (alias vs relative vs barrel).

**Input:** candidates[], aliases?, config?  
**Output:** patches[]

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface ImportCandidate {
  file: string;
  line: number;
  specifier: string;
  currentPath: string;
  possiblePaths: string[];
}

interface Patch {
  file: string;
  line: number;
  from: string;
  to: string;
  reason: string;
  confidence: number;
}

interface ResolutionConfig {
  preferAliases: boolean;
  preferBarrels: boolean;
  minConfidence: number;
}

const DEFAULT_CONFIG: ResolutionConfig = {
  preferAliases: true,
  preferBarrels: true,
  minConfidence: 0.7
};

export default async function resolveAlternatives(input: { 
  candidates: ImportCandidate[];
  aliases?: string[];
  config?: Partial<ResolutionConfig>;
}): Promise<{ patches: Patch[] }> {
  const config = { ...DEFAULT_CONFIG, ...input.config };
  const patches: Patch[] = [];
  
  for (const candidate of input.candidates) {
    const resolutions: Array<{ path: string; confidence: number; reason: string }> = [];
    
    for (const possiblePath of candidate.possiblePaths) {
      let exists = false;
      let isFile = false;
      
      // Check if file exists with various extensions
      const extensions = ['', '.ts', '.js', '.vue', '.tsx', '.jsx', '/index.ts', '/index.js', '/index.vue'];
      
      for (const ext of extensions) {
        const fullPath = possiblePath + ext;
        if (fs.existsSync(fullPath)) {
          exists = true;
          isFile = fs.statSync(fullPath).isFile();
          break;
        }
      }
      
      if (exists && isFile) {
        // Calculate confidence based on path characteristics
        let confidence = 0.5;
        let reason = 'File exists';
        
        // Higher confidence for aliases
        if (possiblePath.includes('/src/') || possiblePath.startsWith('@')) {
          confidence += 0.2;
          reason = 'Uses project alias';
        }
        
        // Higher confidence for barrel files
        if (possiblePath.includes('/index.')) {
          confidence += 0.15;
          reason = 'Barrel file (index)';
        }
        
        // Higher confidence for shorter paths
        if (possiblePath.length < candidate.currentPath.length) {
          confidence += 0.1;
          reason += ', shorter path';
        }
        
        resolutions.push({
          path: possiblePath,
          confidence,
          reason
        });
      }
    }
    
    // Sort by confidence and pick the best
    resolutions.sort((a, b) => b.confidence - a.confidence);
    
    if (resolutions.length > 0 && resolutions[0].confidence >= config.minConfidence) {
      const best = resolutions[0];
      
      patches.push({
        file: candidate.file,
        line: candidate.line,
        from: candidate.currentPath,
        to: best.path,
        reason: best.reason,
        confidence: best.confidence
      });
    }
  }
  
  return { patches };
}
```

### 3. vue-import-alternatives-apply

Применение исправлений к файлам.

**Input:** patches[], backup?, validate?  
**Output:** fixed_files[], errors[]

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface Patch {
  file: string;
  line: number;
  from: string;
  to: string;
  reason: string;
  confidence: number;
}

interface ApplyResult {
  fixed_files: string[];
  errors: Array<{ file: string; error: string }>;
  summary: string;
}

export default async function applyPatches(input: { 
  patches: Patch[];
  backup?: boolean;
  validate?: boolean;
}): Promise<ApplyResult> {
  const fixed_files: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  
  // Group patches by file
  const byFile = new Map<string, Patch[]>();
  for (const patch of input.patches) {
    if (!byFile.has(patch.file)) {
      byFile.set(patch.file, []);
    }
    byFile.get(patch.file)!.push(patch);
  }
  
  // Process each file
  for (const [file, filePatches] of byFile) {
    try {
      // Read original content
      let content = fs.readFileSync(file, 'utf-8');
      
      // Create backup if requested
      if (input.backup) {
        const backupPath = file + '.backup';
        fs.writeFileSync(backupPath, content, 'utf-8');
      }
      
      // Apply each patch for this file
      for (const patch of filePatches) {
        // Replace the import path
        const importRegex = new RegExp(
          `(['"])${escapeRegex(patch.from)}(['"])`,
          'g'
        );
        content = content.replace(importRegex, `$1${patch.to}$2`);
      }
      
      // Validate if requested
      if (input.validate) {
        const validation = validateVueImports(content);
        if (!validation.valid) {
          errors.push({
            file,
            error: `Validation failed: ${validation.errors.join(', ')}`
          });
          continue;
        }
      }
      
      // Write fixed content
      fs.writeFileSync(file, content, 'utf-8');
      fixed_files.push(file);
    } catch (error) {
      errors.push({
        file,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return {
    fixed_files,
    errors,
    summary: `Fixed ${fixed_files.length} file(s)${errors.length > 0 ? `, ${errors.length} error(s)` : ''}`
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validateVueImports(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for broken imports (non-existent paths that weren't fixed)
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip external imports
    if (importPath.startsWith('@') || importPath.startsWith('~') || importPath.startsWith('.')) {
      // These need manual resolution
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```
