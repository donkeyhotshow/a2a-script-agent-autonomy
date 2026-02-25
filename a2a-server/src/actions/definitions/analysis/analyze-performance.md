# analyze-performance

Анализ производительности: N+1, missing indexes, memory leaks. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
80

## Context
```json
{ "category": "performance", "severity": "warning" }
```

## Triggers
- performance analysis
- analyze performance
- bottlenecks
- n+1
- performance check

## Sub-actions

### 1. perf-collect
Сбор файлов для анализа.

**Input:** rootDir  
**Output:** files[]

```typescript
interface SourceFile {
  path: string;
  extension: string;
  content?: string;
}

export default async function run(input: { rootDir: string }): Promise<{ files: SourceFile[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const files: SourceFile[] = [];
  const extensions = ['.php', '.js', '.ts', '.vue', '.jsx', '.tsx'];
  
  async function scanDir(dir: string, depth: number = 0): Promise<void> {
    if (depth > 8) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'vendor', 'dist', 'build', 'storage'];
          if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push({
              path: path.relative(input.rootDir, fullPath),
              extension: ext
            });
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }
  
  await scanDir(input.rootDir);
  
  return { files };
}
```

### 2. perf-detect-n1
Обнаружение N+1 запросов (Laravel/Eloquent и т.п.).

**Input:** files[]  
**Output:** n1_findings[]

```typescript
interface N1Finding {
  file: string;
  line: number;
  type: 'n+1-query' | 'lazy-loading' | 'missing-with';
  message: string;
  suggestion: string;
}

export default async function run(input: { files: Array<{ path: string; extension: string }> }): Promise<{ n1_findings: N1Finding[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const n1_findings: N1Finding[] = [];
  const rootDir = process.cwd();
  
  for (const file of input.files) {
    try {
      const content = await fs.readFile(path.join(rootDir, file.path), 'utf-8');
      const lines = content.split('\n');
      
      // PHP/Laravel patterns
      if (file.extension === '.php') {
        // foreach with model query inside
        const foreachPattern = /foreach\s*\([^)]*as\s+\$[^)]+\)\s*\{[^}]*(?:Model|query|where|get|first)\([^)]*\)/gi;
        let match;
        const regex = /foreach\s*\([^)]+\)\s*\{/g;
        
        while ((match = regex.exec(content)) !== null) {
          const startPos = match.index;
          const endBrace = content.indexOf('}', startPos);
          if (endBrace > startPos) {
            const block = content.slice(startPos, endBrace + 50);
            if (block.includes('->get()') || block.includes('->first()') || block.includes('::all()')) {
              const lineNum = content.slice(0, startPos).split('\n').length;
              n1_findings.push({
                file: file.path,
                line: lineNum,
                type: 'n+1-query',
                message: 'Potential N+1 query: query inside foreach loop',
                suggestion: 'Use eager loading: Model::with("relation")->get() or query->with("relation")->get()'
              });
            }
          }
        }
        
        // Missing with() on relationships
        if (content.includes('function ') && (content.includes('hasMany') || content.includes('hasOne') || content.includes('belongsTo'))) {
          const hasWith = content.includes('->with(') || content.includes('with([');
          if (!hasWith) {
            n1_findings.push({
              file: file.path,
              line: 1,
              type: 'missing-with',
              message: 'Model has relationships but no eager loading hint',
              suggestion: 'Add $with = ["relation"] or use ->with() in queries'
            });
          }
        }
      }
      
      // JavaScript/TypeScript patterns
      if (['.js', '.ts', '.jsx', '.tsx'].includes(file.extension)) {
        // loop with async await
        const loopWithAsync = content.match(/(?:for|forEach|map)\s*\([^)]+\)\s*\{[^}]*await[^}]*\}/g);
        if (loopWithAsync) {
          for (let i = 0; i < lines.length; i++) {
            if ((lines[i].includes('for (') || lines[i].includes('forEach')) && lines.slice(i, i + 5).some(l => l.includes('await fetch') || l.includes('await api'))) {
              n1_findings.push({
                file: file.path,
                line: i + 1,
                type: 'n+1-query',
                message: 'Multiple async requests in loop - batch requests instead',
                suggestion: 'Use Promise.all() or batch API calls'
              });
            }
          }
        }
      }
      
    } catch {
      // Skip files that can't be read
    }
  }
  
  return { n1_findings };
}
```

### 3. perf-detect-missing-indexes
Обнаружение отсутствующих индексов (миграции, запросы).

**Input:** files[]  
**Output:** index_findings[]

```typescript
interface IndexFinding {
  file: string;
  line: number;
  column?: string;
  type: 'missing-index' | 'no-composite-index' | 'sequential-scan';
  message: string;
  suggestion: string;
}

export default async function run(input: { files: Array<{ path: string; extension: string }> }): Promise<{ index_findings: IndexFinding[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const index_findings: IndexFinding[] = [];
  const rootDir = process.cwd();
  
  for (const file of input.files) {
    try {
      const content = await fs.readFile(path.join(rootDir, file.path), 'utf-8');
      const lines = content.split('\n');
      
      // Laravel migrations
      if (file.path.includes('migrations') && file.extension === '.php') {
        // Check for foreign keys without indexes
        const foreignKeyPattern = /\$table->foreignId\(['"]([^'"]+)['"]\)/g;
        let match;
        
        while ((match = foreignKeyPattern.exec(content)) !== null) {
          const hasIndex = content.includes('->index()') || content.includes('->unique()');
          if (!hasIndex) {
            const lineNum = content.slice(0, match.index).split('\n').length;
            index_findings.push({
              file: file.path,
              line: lineNum,
              column: match[1],
              type: 'missing-index',
              message: `Foreign key '${match[1]}' should be indexed`,
              suggestion: 'Add ->index() or rely on foreignId()->constrained() for auto-index'
            });
          }
        }
        
        // Check for where clause columns that might need indexes
        const wherePattern = /where\(['"]([^'"]+)['"]/g;
        const uniqueWheres = new Set<string>();
        while ((match = wherePattern.exec(content)) !== null) {
          uniqueWheres.add(match[1]);
        }
        
        // Common columns that should be indexed
        const commonlyIndexed = ['user_id', 'email', 'status', 'type', 'category_id', 'parent_id'];
        for (const col of uniqueWheres) {
          if (commonlyIndexed.some(ci => col.includes(ci)) && !content.includes(`$${col}`) && !content.includes(`'${col}'`)) {
            // This is a heuristic check
          }
        }
      }
      
      // Check for potentially slow queries
      if (file.extension === '.php' && (file.path.includes('Controller') || file.path.includes('Repository'))) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // LIKE without wildcards at start
          if (line.includes('whereLike') || line.includes('LIKE')) {
            if (line.includes("'%") || line.includes("%'")) {
              index_findings.push({
                file: file.path,
                line: i + 1,
                type: 'sequential-scan',
                message: 'LIKE pattern may cause full table scan',
                suggestion: 'Consider full-text search for large datasets'
              });
            }
          }
          
          // OR conditions that could be union
          if (line.includes('where(') && lines[i + 1]?.includes('orWhere')) {
            index_findings.push({
              file: file.path,
              line: i + 1,
              type: 'no-composite-index',
              message: 'Multiple OR conditions may benefit from UNION or composite index',
              suggestion: 'Review query and consider composite index'
            });
          }
        }
      }
      
    } catch {
      // Skip files that can't be read
    }
  }
  
  return { index_findings };
}
```
