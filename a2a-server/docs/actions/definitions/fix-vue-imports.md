# fix-vue-imports

Исправить сломанные импорты в Vue файлах.

**Priority:** 10

**Планы:** [a2a-ai-hub docs](../../../../a2a-ai-hub/docs/README.md).

## Sub-actions (4 steps)

### 1. vue-import-detect

Определить сломанные импорты в Vue файлах.

**Input:** none  
**Output:** broken_imports[]

```typescript
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

interface BrokenImport {
  file: string;
  line: number;
  specifier: string;
}

const IMPORT_RE = /(?:from\s+|require\s*\(\s*)['"]([^'"]+)['"]/g;

function stripQuery(s: string): string {
  return s.replace(/[?#].*$/, '');
}

export default async function run(input: { rootDir: string }): Promise<{ broken_imports: BrokenImport[] }> {
  const root = resolve(input.rootDir || '.');
  const broken: BrokenImport[] = [];
  
  const files = collectFiles(root, ['.ts', '.tsx', '.vue']);
  
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      
      IMPORT_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      
      while ((m = IMPORT_RE.exec(line)) !== null) {
        const spec = stripQuery(m[1] || '');
        if (isPackageImport(spec)) continue;
        
        if (spec.startsWith('.')) {
          const resolved = resolve(dirname(file), spec);
          if (!resolveExists(resolved)) {
            broken.push({ file, line: i + 1, specifier: spec });
          }
        }
      }
    }
  }
  
  return { broken_imports: broken };
}

function isPackageImport(spec: string): boolean {
  if (spec.startsWith('.')) return false;
  if (spec.startsWith('@/')) return false;
  if (/^@(components|utils|lib|features)\//.test(spec)) return false;
  if (/^@[\w-]+\//.test(spec)) return true;
  if (spec.startsWith('#')) return true;
  return !spec.includes('/');
}

function collectFiles(dir: string, exts: string[], out: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.name === 'node_modules') continue;
    if (e.isDirectory()) collectFiles(full, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(full);
  }
  return out;
}

function resolveExists(p: string): boolean {
  return existsSync(p) || existsSync(p + '.ts') || existsSync(p + '.vue') || existsSync(join(p, 'index.ts'));
}
```

### 2. vue-import-resolve

Разрешить правильные пути для сломанных импортов.

**Input:** broken_imports[]  
**Output:** patches[]

```typescript
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, relative, join } from 'node:path';

interface BrokenImport {
  file: string;
  line: number;
  specifier: string;
}

interface ResolvedPatch {
  file: string;
  line: number;
  from: string;
  to: string;
}

export default async function run(input: { broken_imports: BrokenImport[], aliases?: Record<string, string> }): Promise<{ patches: ResolvedPatch[] }> {
  const { broken_imports, aliases = {} } = input;
  const patches: ResolvedPatch[] = [];
  
  for (const imp of broken_imports) {
    let absPath: string | null = null;
    
    if (imp.specifier.startsWith('.')) {
      absPath = resolve(dirname(imp.file), imp.specifier);
      absPath = tryResolveExists(absPath) ?? absPath;
      
      if (!absPath || !existsSync(absPath)) {
        const base = imp.specifier.split(/[/\\]/).pop() ?? '';
        const candidates = findAllCandidates(dirname(imp.file), base);
        if (candidates.length === 1) absPath = candidates[0];
      }
    } else {
      // Try alias resolution
      for (const [alias, path] of Object.entries(aliases)) {
        if (imp.specifier.startsWith(alias)) {
          const suffix = imp.specifier.slice(alias.length);
          absPath = resolve(path, suffix);
          absPath = tryResolveExists(absPath);
          break;
        }
      }
    }
    
    if (absPath && existsSync(absPath)) {
      const to = toImportSpecifier(absPath, imp.file);
      patches.push({ file: imp.file, line: imp.line, from: imp.specifier, to });
    }
  }
  
  return { patches };
}

function tryResolveExists(p: string | null): string | null {
  if (!p) return null;
  if (existsSync(p)) return p;
  for (const ext of ['.ts', '.tsx', '.vue']) {
    if (existsSync(p + ext)) return p + ext;
  }
  if (existsSync(join(p, 'index.ts'))) return join(p, 'index.ts');
  return null;
}

function findAllCandidates(rootDir: string, baseName: string): string[] {
  const out: string[] = [];
  const ext = /\.(ts|tsx|vue)$/;
  
  function walk(dir: string) {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.name === 'node_modules') continue;
      if (e.isDirectory()) walk(full);
      else if (ext.test(e.name)) {
        const noExt = e.name.replace(ext, '');
        if (noExt === baseName) out.push(full);
      }
    }
  }
  
  walk(rootDir);
  return out;
}

function toImportSpecifier(absTarget: string, fromFile: string): string {
  const fromDir = dirname(fromFile);
  let rel = relative(fromDir, absTarget).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = './' + rel;
  rel = rel.replace(/\.(ts|tsx|vue)$/, '');
  return rel;
}
```

### 3. vue-import-apply

Применить исправления к файлам.

**Input:** patches[]  
**Output:** fixed_files[]

```typescript
import { readFileSync, writeFileSync } from 'node:fs';

interface ResolvedPatch {
  file: string;
  line: number;
  from: string;
  to: string;
}

export default async function run(input: { patches: ResolvedPatch[] }): Promise<{ fixed_files: string[] }> {
  const byFile = groupByFile(input.patches);
  const fixedFiles: string[] = [];
  
  for (const [file, filePatches] of Object.entries(byFile)) {
    let content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    const sorted = [...filePatches].sort((a, b) => b.line - a.line);
    
    for (const p of sorted) {
      const idx = p.line - 1;
      if (idx >= 0 && idx < lines.length) {
        lines[idx] = lines[idx].replace(p.from, p.to);
      }
    }
    
    content = lines.join('\n');
    writeFileSync(file, content);
    fixedFiles.push(file);
  }
  
  return { fixed_files: fixedFiles };
}

function groupByFile(patches: ResolvedPatch[]): Record<string, ResolvedPatch[]> {
  const map: Record<string, ResolvedPatch[]> = {};
  for (const p of patches) {
    (map[p.file] ??= []).push(p);
  }
  return map;
}
```

### 4. vue-import-cleanup

Очистить временные файлы.

### 5. vue-import-escalate (optional)

Если после **vue-import-resolve** в `result.script` переданы `partial_escalate: true` и `unresolved_imports[]` (скрипт не смог однозначно сопоставить часть импортов), сервер не переходит к **vue-import-apply**, а отдаёт **`execute.form.choices`**: перейти в **Coder**, завершить с частичным результатом или (отдельный сценарий) вернуться к роутеру — см. `simulations/fix-vue-imports/` и `simulations/fix-vue-imports-decline/`.

**Input:** none  
**Output:** cleanup_count

```typescript
import { readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const TEMP_EXTENSIONS = ['.patch', '.tmp', '.bak'];

export default async function run(input: { rootDir?: string }): Promise<{ cleanup_count: number }> {
  const cwd = input.rootDir || '.';
  let removed = 0;
  
  function cleanup(dir: string): number {
    const entries = readdirSync(dir, { withFileTypes: true });
    let count = 0;
    
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        count += cleanup(full);
      } else if (TEMP_EXTENSIONS.some((ext) => e.name.endsWith(ext))) {
        unlinkSync(full);
        count++;
      }
    }
    
    return count;
  }
  
  try {
    removed = cleanup(cwd);
  } catch {
    // Ignore errors
  }
  
  return { cleanup_count: removed };
}
```

## Context

- Framework: Vue 3
- Build tool: Vite
- Aliases: @ -> resources/js, ~ -> resources
