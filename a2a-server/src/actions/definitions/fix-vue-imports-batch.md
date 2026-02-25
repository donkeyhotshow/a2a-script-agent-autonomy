# fix-vue-imports-batch

Исправить сломанные импорты в Vue файлах с серверной обработкой (батчами). **План:** [fix-vue-imports-batch](../../../docs/archive/fix-vue-imports-batch.md).

**План (детали, state machine):** [fix-vue-imports-batch details](../../../docs/archive/fix-vue-imports-batch.md)

## Priority
90

## Context
- Framework: Vue 3
- Build tool: Vite
- Processing: Batch mode with server-side logic. Phase: init | detect | resolve | apply | completed

## Triggers
- batch fix vue imports
- server-side vue import fix
- fix vue imports batch
- исправь все импорты

## Sub-actions

### 1. batch-init
Инициализация: загрузка конфигурации (vite.config, aliases). Condition: context.phase === undefined | 'init'.

**Input:** rootDir, options?  
**Output:** request_files?, context.aliases, phase=detect

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface AliasConfig {
  [key: string]: string;
}

interface InitContext {
  phase: string;
  aliases: AliasConfig;
  configFiles: string[];
  projectRoot: string;
}

interface InitOptions {
  maxBatchSize?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

const DEFAULT_OPTIONS = {
  maxBatchSize: 10,
  includePatterns: ['**/*.vue', '**/*.ts', '**/*.js'],
  excludePatterns: ['node_modules/**', 'dist/**', 'build/**']
};

export default async function batchInit(input: { 
  rootDir: string;
  options?: InitOptions;
}): Promise<{
  request_files?: string[];
  context: InitContext;
}> {
  const options = { ...DEFAULT_OPTIONS, ...input.options };
  const projectRoot = input.rootDir || process.cwd();
  
  // Find config files
  const configFiles = findConfigFiles(projectRoot);
  
  // Load aliases from vite.config
  const aliases = await loadAliases(projectRoot);
  
  return {
    request_files: configFiles,
    context: {
      phase: 'detect',
      aliases,
      configFiles,
      projectRoot
    }
  };
}

function findConfigFiles(rootDir: string): string[] {
  const configs = [
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mts',
    'tsconfig.json',
    'jsconfig.json',
    'package.json'
  ];
  
  const found: string[] = [];
  
  for (const config of configs) {
    const fullPath = path.join(rootDir, config);
    if (fs.existsSync(fullPath)) {
      found.push(fullPath);
    }
  }
  
  return found;
}

async function loadAliases(rootDir: string): Promise<AliasConfig> {
  const aliases: AliasConfig = {};
  
  // Try vite.config.ts
  const viteConfigPath = path.join(rootDir, 'vite.config.ts');
  if (fs.existsSync(viteConfigPath)) {
    try {
      const content = fs.readFileSync(viteConfigPath, 'utf-8');
      
      // Simple regex extraction for common patterns
      const aliasRegex = /['"]@([^'"]+)['"]:\s*['"]([^'"]+)['"]/g;
      let match;
      
      while ((match = aliasRegex.exec(content)) !== null) {
        aliases['@' + match[1]] = match[2];
      }
      
      // Also check resolve.alias
      const resolveAliasRegex = /resolve:\s*\{[^}]*alias:\s*\{([^}]+)\}/s;
      const resolveMatch = content.match(resolveAliasRegex);
      
      if (resolveMatch) {
        const innerMatch = resolveMatch[1].matchAll(/['"]@?([^'"]+)['"]:\s*['"]([^'"]+)['"]/g);
        for (const m of innerMatch) {
          aliases[m[1]] = m[2];
        }
      }
    } catch (e) {
      // Skip parse errors
    }
  }
  
  // Add defaults if not found
  if (Object.keys(aliases).length === 0) {
    aliases['@'] = '/src';
    aliases['~'] = '/src';
  }
  
  return aliases;
}
```

### 2. batch-detect
Обнаружение сломанных импортов — батч по 10 файлов. Condition: context.phase === 'detect'.

**Input:** rootDir, context.aliases, context.batchIndex, options?  
**Output:** broken_imports[], context.phase=resolve, context.hasMore

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface BrokenImport {
  file: string;
  line: number;
  specifier: string;
  importPath: string;
  error: 'not-found' | 'invalid-syntax' | 'circular';
}

interface DetectContext {
  phase: string;
  aliases: Record<string, string>;
  batchIndex: number;
  totalScanned: number;
  projectRoot: string;
}

interface DetectOptions {
  batchSize?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export default async function batchDetect(input: {
  rootDir: string;
  context: DetectContext;
  options?: DetectOptions;
}): Promise<{
  broken_imports: BrokenImport[];
  context: { phase: string; hasMore: boolean; batchIndex: number; totalScanned: number };
}> {
  const batchSize = input.options?.batchSize || 10;
  const projectRoot = input.context.projectRoot || input.rootDir;
  
  // Find all Vue/TS/JS files
  const allFiles = findSourceFiles(projectRoot, input.options?.includePatterns, input.options?.excludePatterns);
  
  // Calculate batch range
  const startIdx = input.context.batchIndex * batchSize;
  const endIdx = Math.min(startIdx + batchSize, allFiles.length);
  const batchFiles = allFiles.slice(startIdx, endIdx);
  
  const broken_imports: BrokenImport[] = [];
  
  // Process each file in batch
  for (const file of batchFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const fileImports = extractImports(content);
      
      for (const imp of fileImports) {
        // Try to resolve the import
        const resolved = resolveImport(imp.path, file, input.context.aliases);
        
        if (!resolved.exists) {
          broken_imports.push({
            file,
            line: imp.line,
            specifier: imp.specifier,
            importPath: imp.path,
            error: 'not-found'
          });
        }
      }
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  const hasMore = endIdx < allFiles.length;
  
  return {
    broken_imports,
    context: {
      phase: hasMore ? 'detect' : 'resolve',
      hasMore,
      batchIndex: input.context.batchIndex + 1,
      totalScanned: endIdx
    }
  };
}

function findSourceFiles(
  rootDir: string,
  includePatterns?: string[],
  excludePatterns?: string[]
): string[] {
  const include = includePatterns || ['**/*.vue', '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'];
  const exclude = excludePatterns || ['node_modules/**', 'dist/**', 'build/**', '.nuxt/**', '.output/**'];
  
  const files: string[] = [];
  
  function walk(dir: string, depth: number): void {
    if (depth > 5) return; // Limit depth
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Check exclusions
        if (exclude.some(p => matchPattern(fullPath, p))) {
          continue;
        }
        
        if (entry.isDirectory()) {
          walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          if (include.some(p => matchPattern(fullPath, p))) {
            files.push(fullPath);
          }
        }
      }
    } catch (e) {
      // Skip inaccessible
    }
  }
  
  walk(rootDir, 0);
  
  return files;
}

function matchPattern(filePath: string, pattern: string): boolean {
  // Simple glob matching
  const regex = pattern
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  
  return new RegExp(regex).test(filePath);
}

function extractImports(content: string): Array<{ path: string; specifier: string; line: number }> {
  const imports: Array<{ path: string; specifier: string; line: number }> = [];
  
  // Match various import syntaxes
  const importRegex = /(?:import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    // Extract specifier
    const beforeImport = content.substring(0, match.index);
    const specifierMatch = beforeImport.match(/import\s+(\{[^}]*\}|\*\s+as\s+\w+|\w+)/);
    const specifier = specifierMatch ? specifierMatch[1] : 'default';
    
    // Skip external imports
    if (!importPath.startsWith('.') && !importPath.startsWith('@') && !importPath.startsWith('~')) {
      continue;
    }
    
    imports.push({
      path: importPath,
      specifier,
      line: lineNumber
    });
  }
  
  return imports;
}

function resolveImport(
  importPath: string,
  fromFile: string,
  aliases: Record<string, string>
): { exists: boolean; resolvedPath?: string } {
  // Handle aliases
  let resolvedPath = importPath;
  
  for (const [alias, target] of Object.entries(aliases)) {
    if (importPath.startsWith(alias)) {
      resolvedPath = importPath.replace(alias, target);
      break;
    }
  }
  
  // Resolve relative to file
  const baseDir = path.dirname(fromFile);
  const absolutePath = path.resolve(baseDir, resolvedPath);
  
  // Check various extensions
  const extensions = ['', '.ts', '.js', '.vue', '.tsx', '.jsx', '/index.ts', '/index.js', '/index.vue'];
  
  for (const ext of extensions) {
    const checkPath = absolutePath + ext;
    if (fs.existsSync(checkPath)) {
      return { exists: true, resolvedPath: checkPath };
    }
  }
  
  return { exists: false };
}
```

### 3. batch-resolve
Разрешение импортов на сервере. Condition: context.phase === 'resolve'. Client отправляет broken_imports, сервер возвращает patches.

**Input:** broken_imports[], context.aliases, context.projectRoot  
**Output:** patches[], request_search? (для поиска файлов на клиенте)

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface BrokenImport {
  file: string;
  line: number;
  specifier: string;
  importPath: string;
  error: string;
}

interface Patch {
  file: string;
  line: number;
  from: string;
  to: string;
  confidence: number;
  strategy: 'extension-add' | 'path-correct' | 'alias-use' | 'barrel-add';
}

interface ResolveResult {
  patches: Patch[];
  request_search?: Array<{ original: string; possibleNames: string[] }>;
}

export default async function batchResolve(input: { 
  broken_imports: BrokenImport[];
  aliases: Record<string, string>;
  projectRoot: string;
}): Promise<ResolveResult> {
  const patches: Patch[] = [];
  const searchRequests: Array<{ original: string; possibleNames: string[] }> = [];
  
  for (const broken of input.broken_imports) {
    const possible = generatePossiblePaths(broken.importPath, broken.file, input.aliases);
    
    // Try to find the correct path
    let bestMatch: { path: string; confidence: number; strategy: Patch['strategy'] } | null = null;
    
    for (const possiblePath of possible.paths) {
      const exists = checkFileExists(possiblePath);
      
      if (exists) {
        const confidence = calculateConfidence(broken.importPath, possiblePath, possible.basePath);
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            path: possiblePath,
            confidence,
            strategy: determineStrategy(broken.importPath, possiblePath)
          };
        }
      }
    }
    
    if (bestMatch) {
      patches.push({
        file: broken.file,
        line: broken.line,
        from: broken.importPath,
        to: bestMatch.path,
        confidence: bestMatch.confidence,
        strategy: bestMatch.strategy
      });
    } else {
      // Need client to search for file
      searchRequests.push({
        original: broken.importPath,
        possibleNames: possible.possibleNames
      });
    }
  }
  
  return {
    patches,
    request_search: searchRequests.length > 0 ? searchRequests : undefined
  };
}

function generatePossiblePaths(
  importPath: string,
  fromFile: string,
  aliases: Record<string, string>
): { paths: string[]; possibleNames: string[]; basePath: string } {
  const paths: string[] = [];
  const possibleNames: string[] = [];
  
  // Get base directory
  const baseDir = path.dirname(fromFile);
  
  // Handle aliases first
  let resolvedPath = importPath;
  for (const [alias, target] of Object.entries(aliases)) {
    if (importPath.startsWith(alias)) {
      resolvedPath = importPath.replace(alias, target);
      break;
    }
  }
  
  // Resolve to absolute
  const absoluteBase = path.resolve(baseDir, resolvedPath);
  paths.push(absoluteBase);
  
  // Try with extensions
  const extensions = ['.ts', '.js', '.vue', '.tsx', '.jsx'];
  for (const ext of extensions) {
    paths.push(absoluteBase + ext);
    paths.push(absoluteBase + '/index' + ext);
  }
  
  // Extract filename for search
  const filename = path.basename(importPath);
  possibleNames.push(filename);
  
  // Possible variations
  const nameWithoutExt = filename.replace(/\.\w+$/, '');
  possibleNames.push(nameWithoutExt);
  
  return { paths, possibleNames, basePath: absoluteBase };
}

function checkFileExists(filePath: string): boolean {
  // Handle relative paths
  if (!path.isAbsolute(filePath)) {
    return false;
  }
  
  return fs.existsSync(filePath);
}

function calculateConfidence(original: string, resolved: string, basePath: string): number {
  let confidence = 0.5;
  
  // Higher confidence if using aliases
  if (resolved.includes('/src/')) {
    confidence += 0.2;
  }
  
  // Higher confidence if path is shorter (simpler)
  if (resolved.length < original.length) {
    confidence += 0.15;
  }
  
  // Higher confidence for barrel files
  if (resolved.includes('/index.')) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1);
}

function determineStrategy(original: string, resolved: string): Patch['strategy'] {
  const origExt = path.extname(original);
  const resExt = path.extname(resolved);
  
  if (!origExt && resExt) {
    return 'extension-add';
  }
  
  if (original.startsWith('@') || original.startsWith('~')) {
    return 'alias-use';
  }
  
  if (resolved.includes('/index.')) {
    return 'barrel-add';
  }
  
  return 'path-correct';
}
```

### 4. batch-apply
Применение исправлений. Condition: context.phase === 'apply'. После применения: phase = hasMore ? 'detect' : 'completed'.

**Input:** patches[], context.batchIndex, context.hasMore, backup?  
**Output:** fixed_files[], context.phase, context.batchIndex

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface Patch {
  file: string;
  line: number;
  from: string;
  to: string;
  confidence: number;
  strategy: string;
}

interface ApplyContext {
  phase: string;
  batchIndex: number;
  hasMore: boolean;
  projectRoot: string;
}

interface ApplyResult {
  fixed_files: string[];
  failed: Array<{ file: string; error: string }>;
  context: { phase: string; batchIndex: number };
  summary: string;
}

const MIN_CONFIDENCE = 0.6;

export default async function batchApply(input: { 
  patches: Patch[];
  context: ApplyContext;
  backup?: boolean;
}): Promise<ApplyResult> {
  const fixed_files: string[] = [];
  const failed: Array<{ file: string; error: string }> = [];
  
  // Filter by confidence
  const validPatches = input.patches.filter(p => p.confidence >= MIN_CONFIDENCE);
  
  // Group by file
  const byFile = new Map<string, Patch[]>();
  for (const patch of validPatches) {
    if (!byFile.has(patch.file)) {
      byFile.set(patch.file, []);
    }
    byFile.get(patch.file)!.push(patch);
  }
  
  // Apply patches to each file
  for (const [file, filePatches] of byFile) {
    try {
      let content = fs.readFileSync(file, 'utf-8');
      
      // Create backup
      if (input.backup) {
        const backupPath = file + '.imports.backup';
        fs.writeFileSync(backupPath, content, 'utf-8');
      }
      
      // Apply each patch
      for (const patch of filePatches) {
        // Create regex to match exact import path
        const importRegex = new RegExp(
          `(['"])${escapeRegex(patch.from)}(['"])`,
          'g'
        );
        
        content = content.replace(importRegex, `$1${patch.to}$2`);
      }
      
      // Write fixed content
      fs.writeFileSync(file, content, 'utf-8');
      fixed_files.push(file);
    } catch (error) {
      failed.push({
        file,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Determine next phase
  const nextPhase = input.context.hasMore ? 'detect' : 'completed';
  
  return {
    fixed_files,
    failed,
    context: {
      phase: nextPhase,
      batchIndex: input.context.hasMore ? input.context.batchIndex + 1 : input.context.batchIndex
    },
    summary: `Applied ${validPatches.length} patches to ${fixed_files.length} files. ${input.context.hasMore ? 'More batches remaining.' : 'Batch processing complete.'}`
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```
