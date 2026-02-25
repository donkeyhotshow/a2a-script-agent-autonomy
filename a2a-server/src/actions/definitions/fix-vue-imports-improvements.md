# fix-vue-imports-improvements

Improvements and refinements for Vue import fixing. Variant of fix-vue-imports. **План:** [fix-vue-imports-improvements](../../../docs/archive/fix-vue-imports-improvements.md).

## Priority
85

## Context
```json
{ "type": "fix", "target": "vue-imports", "method": "improvements" }
```

## Triggers
- improve vue imports
- fix vue imports improvements
- vue import refinements
- оптимизируй импорты

## Sub-actions

### 1. vue-import-improvements-analyze
Анализ текущего стиля импортов и предложение улучшений (стиль путей, использование баррелей).

**Input:** rootDir, options?  
**Output:** suggestions[]

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface ImportStyle {
  type: 'relative' | 'alias' | 'absolute';
  depth: number;
  usesBarrel: boolean;
  hasExtension: boolean;
}

interface Suggestion {
  type: 'path-style' | 'barrel-usage' | 'extension' | 'order' | 'consistency';
  severity: 'info' | 'warning' | 'suggestion';
  file: string;
  line?: number;
  message: string;
  current?: string;
  suggested?: string;
  impact: 'low' | 'medium' | 'high';
}

interface AnalysisResult {
  summary: {
    totalFiles: number;
    totalImports: number;
    aliasUsage: number;
    relativeUsage: number;
    barrelUsage: number;
  };
  suggestions: Suggestion[];
}

const DEPTH_THRESHOLD = 3; // Relative paths deeper than this are candidates for aliasing
const POPULAR_ALIASES = ['@', '~', '@components', '@utils', '@composables', '@services'];

export default async function analyzeImprovements(input: { 
  rootDir: string;
  options?: {
    maxDepth?: number;
    preferAliases?: boolean;
    preferBarrels?: boolean;
  };
}): Promise<{ suggestions: Suggestion[]; summary: AnalysisResult['summary'] }> {
  const options = {
    maxDepth: input.options?.maxDepth || DEPTH_THRESHOLD,
    preferAliases: input.options?.preferAliases ?? true,
    preferBarrels: input.options?.preferBarrels ?? true
  };
  
  const suggestions: Suggestion[] = [];
  
  // Find all source files
  const files = findVueFiles(input.rootDir);
  
  let totalImports = 0;
  let aliasUsage = 0;
  let relativeUsage = 0;
  let barrelUsage = 0;
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const imports = extractImports(content);
      
      for (const imp of imports) {
        totalImports++;
        
        const style = analyzeImportStyle(imp.path);
        
        if (style.type === 'alias') {
          aliasUsage++;
        } else if (style.type === 'relative') {
          relativeUsage++;
          
          // Suggest alias for deep relative imports
          if (style.depth > options.maxDepth) {
            suggestions.push({
              type: 'path-style',
              severity: 'suggestion',
              file,
              line: imp.line,
              message: `Deep relative import (depth ${style.depth}) could use alias`,
              current: imp.path,
              suggested: suggestAlias(imp.path, options.preferAliases ? POPULAR_ALIASES : []),
              impact: 'medium'
            });
          }
        }
        
        if (style.usesBarrel) {
          barrelUsage++;
        } else if (style.type === 'relative' && !style.hasExtension) {
          // Suggest barrel usage
          suggestions.push({
            type: 'barrel-usage',
            severity: 'info',
            file,
            line: imp.line,
            message: `Import could use barrel file (index)`,
            current: imp.path,
            suggested: imp.path + '/index',
            impact: 'low'
          });
        }
      }
      
      // Check import ordering
      const orderIssues = checkImportOrder(content, imports);
      suggestions.push(...orderIssues.map(issue => ({ ...issue, file })));
      
    } catch (e) {
      // Skip unreadable files
    }
  }
  
  // Add summary suggestions
  if (relativeUsage > aliasUsage && options.preferAliases) {
    suggestions.push({
      type: 'consistency',
      severity: 'warning',
      file: input.rootDir,
      message: `Project uses more relative imports (${relativeUsage}) than aliases (${aliasUsage}). Consider standardizing on aliases.`,
      impact: 'high'
    });
  }
  
  return {
    suggestions,
    summary: {
      totalFiles: files.length,
      totalImports,
      aliasUsage,
      relativeUsage,
      barrelUsage
    }
  };
}

function findVueFiles(rootDir: string): string[] {
  const files: string[] = [];
  
  function walk(dir: string, depth: number): void {
    if (depth > 5) return;
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
            walk(fullPath, depth + 1);
          }
        } else if (entry.isFile() && /\.(vue|ts|tsx|js|jsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // Skip inaccessible
    }
  }
  
  walk(rootDir, 0);
  return files;
}

function extractImports(content: string): Array<{ path: string; line: number; specifier: string }> {
  const imports: Array<{ path: string; line: number; specifier: string }> = [];
  
  const regex = /(?:import\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const importPath = match[1];
    
    // Skip external imports
    if (importPath.startsWith('.') || importPath.startsWith('@') || importPath.startsWith('~')) {
      const lineNum = content.substring(0, match.index).split('\n').length;
      const specifierMatch = content.substring(0, match.index).match(/import\s+(\{[^}]*\}|\w+)/);
      
      imports.push({
        path: importPath,
        line: lineNum,
        specifier: specifierMatch ? specifierMatch[1] : 'default'
      });
    }
  }
  
  return imports;
}

function analyzeImportStyle(importPath: string): ImportStyle {
  let type: ImportStyle['type'] = 'absolute';
  let depth = 0;
  let usesBarrel = false;
  let hasExtension = false;
  
  if (importPath.startsWith('@') || importPath.startsWith('~')) {
    type = 'alias';
    // Count path depth
    depth = importPath.split('/').length - 1;
  } else if (importPath.startsWith('.')) {
    type = 'relative';
    // Count ../ depth
    const relativeMatch = importPath.match(/^(\.\.\/)+/);
    if (relativeMatch) {
      depth = relativeMatch[1].split('../').length - 1;
    } else {
      depth = importPath.split('/').length - 1;
    }
  }
  
  usesBarrel = importPath.includes('/index');
  hasExtension = /\.\w+$/.test(importPath);
  
  return { type, depth, usesBarrel, hasExtension };
}

function suggestAlias(relativePath: string, aliases: string[]): string {
  // This would need project-specific configuration
  // For now, return a placeholder
  return `@${relativePath.replace(/^\.\.?\/?/, '')}`;
}

function checkImportOrder(content: string, imports: Array<{ path: string; line: number }>): Omit<Suggestion, 'file'>[] {
  const issues: Omit<Suggestion, 'file'>[] = [];
  
  // Simple check: external imports should come before relative
  let lastExternal = -1;
  let lastRelative = -1;
  
  for (let i = 0; i < imports.length; i++) {
    const imp = imports[i];
    const isExternal = !imp.path.startsWith('.') && !imp.path.startsWith('@');
    
    if (isExternal) {
      lastExternal = i;
      if (lastRelative !== -1 && lastRelative > lastExternal) {
        issues.push({
          type: 'order',
          severity: 'warning',
          line: imp.line,
          message: 'External imports should come before relative imports',
          impact: 'low'
        });
      }
    } else {
      lastRelative = i;
    }
  }
  
  return issues;
}
```

### 2. vue-import-improvements-apply
Применение предложенных улучшений (опционально батчем).

**Input:** suggestions[], rootDir, confirm?, dryRun?  
**Output:** applied[], skipped[], errors[]

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface Suggestion {
  type: 'path-style' | 'barrel-usage' | 'extension' | 'order' | 'consistency';
  severity: 'info' | 'warning' | 'suggestion';
  file: string;
  line?: number;
  message: string;
  current?: string;
  suggested?: string;
  impact: 'low' | 'medium' | 'high';
}

interface ApplyResult {
  applied: string[];
  skipped: string[];
  errors: Array<{ file: string; error: string }>;
  summary: string;
}

export default async function applyImprovements(input: { 
  suggestions: Suggestion[];
  rootDir: string;
  confirm?: boolean;
  dryRun?: boolean;
}): Promise<ApplyResult> {
  const applied: string[] = [];
  const skipped: string[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  
  // Filter for actionable suggestions
  const actionable = input.suggestions.filter(s => 
    s.suggested && (s.impact === 'high' || s.impact === 'medium')
  );
  
  // Group by file
  const byFile = new Map<string, Suggestion[]>();
  for (const suggestion of actionable) {
    if (!byFile.has(suggestion.file)) {
      byFile.set(suggestion.file, []);
    }
    byFile.get(suggestion.file)!.push(suggestion);
  }
  
  // Apply to each file
  for (const [file, fileSuggestions] of byFile) {
    try {
      let content = fs.readFileSync(file, 'utf-8');
      let modified = false;
      
      for (const suggestion of fileSuggestions) {
        if (!suggestion.current || !suggestion.suggested) continue;
        
        // Replace the import path
        const importRegex = new RegExp(
          `(['"])${escapeRegex(suggestion.current)}(['"])`,
          'g'
        );
        
        const newContent = content.replace(importRegex, `$1${suggestion.suggested}$2`);
        
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
      
      if (modified) {
        if (input.dryRun) {
          skipped.push(`[DRY RUN] Would modify: ${file}`);
        } else if (input.confirm) {
          // Create backup
          const backupPath = file + '.improvements.backup';
          fs.writeFileSync(backupPath, fs.readFileSync(file, 'utf-8'), 'utf-8');
          
          // Write modified content
          fs.writeFileSync(file, content, 'utf-8');
          applied.push(file);
        } else {
          skipped.push(`Confirmation required for: ${file}`);
        }
      } else {
        skipped.push(`No changes needed: ${file}`);
      }
    } catch (error) {
      errors.push({
        file,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return {
    applied,
    skipped,
    errors,
    summary: `Applied improvements to ${applied.length} file(s). ${skipped.length} skipped. ${errors.length} errors.`
  };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
```

### 3. vue-import-improvements-validate
Валидация после применения улучшений.

**Input:** files[], rootDir  
**Output:** valid, issues[]

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface ValidationIssue {
  file: string;
  line?: number;
  type: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: string;
}

export default async function validateImprovements(input: { 
  files: string[];
  rootDir: string;
}): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  
  for (const file of input.files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check 1: No broken imports
      const brokenImports = findBrokenImports(content, file);
      issues.push(...brokenImports.map(imp => ({
        file,
        line: imp.line,
        type: 'broken-import',
        message: `Cannot resolve: ${imp.path}`
      })));
      
      // Check 2: No duplicate imports
      const duplicates = findDuplicateImports(content);
      issues.push(...duplicates.map(dup => ({
        file,
        line: dup.line,
        type: 'duplicate-import',
        message: `Duplicate import: ${dup.path}`
      })));
      
      // Check 3: Syntax validity
      const syntaxIssues = checkSyntaxValidity(content);
      if (syntaxIssues) {
        issues.push({
          file,
          type: 'syntax-error',
          message: syntaxIssues
        });
      }
      
    } catch (error) {
      issues.push({
        file,
        type: 'read-error',
        message: error instanceof Error ? error.message : 'Cannot read file'
      });
    }
  }
  
  return {
    valid: issues.length === 0,
    issues,
    summary: issues.length === 0 
      ? 'All improvements validated successfully' 
      : `Found ${issues.length} issue(s) requiring attention`
  };
}

function findBrokenImports(content: string, file: string): Array<{ path: string; line: number }> {
  const broken: Array<{ path: string; line: number }> = [];
  const baseDir = path.dirname(file);
  
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    // Skip external
    if (!importPath.startsWith('.') && !importPath.startsWith('@') && !importPath.startsWith('~')) {
      continue;
    }
    
    // Try to resolve
    let resolved: string;
    if (importPath.startsWith('@') || importPath.startsWith('~')) {
      resolved = path.join(baseDir, importPath);
    } else {
      resolved = path.resolve(baseDir, importPath);
    }
    
    // Check with extensions
    const extensions = ['', '.ts', '.js', '.vue', '.tsx', '.jsx', '/index.ts', '/index.js'];
    const exists = extensions.some(ext => fs.existsSync(resolved + ext));
    
    if (!exists) {
      broken.push({ path: importPath, line: lineNum });
    }
  }
  
  return broken;
}

function findDuplicateImports(content: string): Array<{ path: string; line: number }> {
  const seen = new Map<string, number>();
  const duplicates: Array<{ path: string; line: number }> = [];
  
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length;
    
    if (seen.has(importPath)) {
      duplicates.push({ path: importPath, line: lineNum });
    } else {
      seen.set(importPath, lineNum);
    }
  }
  
  return duplicates;
}

function checkSyntaxValidity(content: string): string | null {
  // Basic syntax checks
  const issues: string[] = [];
  
  // Check for unbalanced braces
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
  }
  
  // Check for unbalanced parentheses
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }
  
  return issues.length > 0 ? issues.join('; ') : null;
}
```
