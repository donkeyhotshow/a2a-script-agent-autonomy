# analyze-laravel

Анализ Laravel: validation, eager loading. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:
** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority

72

## Triggers

- laravel analysis
- analyze laravel
- missing validation
- eager loading

## Sub-actions

### 1. analyze-laravel-scan

Scan for missing validation, N+1, eager loading.

**Input:** rootDir  
**Output:** findings[]

```typescript
interface LaravelFinding {
  file: string;
  line: number;
  type: 'missing-validation' | 'n+1-query' | 'eager-loading' | 'mass-assignment' | 'unsafe-query';
  severity: 'error' | 'warning';
  message: string;
  suggestion?: string;
}

export default async function run(input: { rootDir: string }): Promise<{ findings: LaravelFinding[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const findings: LaravelFinding[] = [];
  
  async function scanDir(dir: string, depth: number = 0): Promise<void> {
    if (depth > 8) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'vendor', 'storage', 'bootstrap', 'public'];
          if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.php') || entry.name.endsWith('.blade.php'))) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const relativePath = path.relative(input.rootDir, fullPath);
            const lines = content.split('\n');
            
            // Check for missing validation in Controllers
            if (content.includes('function store') || content.includes('function update')) {
              const hasValidate = content.includes('$this->validate') || content.includes('validate(') || content.includes('Request::validate');
              const hasFormRequest = content.includes('FormRequest') || content.includes('Request');
              
              if (!hasValidate && !hasFormRequest) {
                findings.push({
                  file: relativePath,
                  line: 1,
                  type: 'missing-validation',
                  severity: 'error',
                  message: 'Controller method lacks validation',
                  suggestion: 'Add $this->validate() or FormRequest class'
                });
              }
            }
            
            // Check for N+1 queries in Models
            if (content.includes('class') && content.includes('extends Model')) {
              // Look for hasMany relationships without eager loading hints
              if (content.includes('hasMany') && !content.includes('with(') && !content.includes('withCount')) {
                findings.push({
                  file: relativePath,
                  line: 1,
                  type: 'n+1-query',
                  severity: 'warning',
                  message: 'Model has hasMany relationship - potential N+1',
                  suggestion: 'Use eager loading: Model::with(["relation"])->get()'
                });
              }
            }
            
            // Check for potential mass assignment issues
            if (content.includes('class') && content.includes('extends Model')) {
              const hasFillable = content.includes('$fillable');
              const hasGuarded = content.includes('$guarded');
              
              if (!hasFillable && !hasGuarded) {
                findings.push({
                  file: relativePath,
                  line: 1,
                  type: 'mass-assignment',
                  severity: 'error',
                  message: 'Model missing $fillable or $guarded',
                  suggestion: 'Define $fillable = [...] or $guarded = ["*"]'
                });
              }
            }
            
            // Check for unsafe query building (raw queries)
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.includes('DB::raw') || line.includes('whereRaw') || line.includes('execute(')) {
                findings.push({
                  file: relativePath,
                  line: i + 1,
                  type: 'unsafe-query',
                  severity: 'warning',
                  message: 'Raw SQL query detected - potential SQL injection',
                  suggestion: 'Use query builder with parameter binding'
                });
              }
            }
            
            // Check for foreach with query inside (classic N+1)
            const foreachWithQuery = content.match(/foreach\s*\([^)]*\$[a-zA-Z_]+\s*as\s*\)\s*\{[^}]*->/g);
            if (foreachWithQuery) {
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('foreach') && lines.slice(i, i + 5).some(l => l.includes('->get()') || l.includes('->first()'))) {
                  findings.push({
                    file: relativePath,
                    line: i + 1,
                    type: 'n+1-query',
                    severity: 'error',
                    message: 'Query inside foreach loop detected - N+1 query problem',
                    suggestion: 'Use eager loading: Model::with("relation")->get()'
                  });
                }
              }
            }
            
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }
  
  await scanDir(input.rootDir);
  
  return { findings };
}
```

### 2. analyze-laravel-report

**Input:** findings[]  
**Output:** report

```typescript
export default async function run(input: { findings: Array<{ file: string; line: number; type: string; severity: string; message: string; suggestion?: string }> }): Promise<{ report: string }> {
  const byType = {
    'missing-validation': input.findings.filter(f => f.type === 'missing-validation'),
    'n+1-query': input.findings.filter(f => f.type === 'n+1-query'),
    'eager-loading': input.findings.filter(f => f.type === 'eager-loading'),
    'mass-assignment': input.findings.filter(f => f.type === 'mass-assignment'),
    'unsafe-query': input.findings.filter(f => f.type === 'unsafe-query'),
  };
  
  const report = `# 🔍 Laravel Analysis Report

## Summary
- **Total Issues:** ${input.findings.length}
- **Errors:** ${input.findings.filter(f => f.severity === 'error').length} 🔴
- **Warnings:** ${input.findings.filter(f => f.severity === 'warning').length} 🟡

## Missing Validation (${byType['missing-validation'].length})
${byType['missing-validation'].map(f => `- \`${f.file}\`: ${f.message} - ${f.suggestion}`).join('\n') || '✅ No issues'}

## N+1 Queries (${byType['n+1-query'].length})
${byType['n+1-query'].map(f => `- \`${f.file}:${f.line}\`: ${f.message} - ${f.suggestion}`).join('\n') || '✅ No issues'}

## Mass Assignment (${byType['mass-assignment'].length})
${byType['mass-assignment'].map(f => `- \`${f.file}\`: ${f.message} - ${f.suggestion}`).join('\n') || '✅ No issues'}

## Unsafe Queries (${byType['unsafe-query'].length})
${byType['unsafe-query'].map(f => `- \`${f.file}:${f.line}\`: ${f.message} - ${f.suggestion}`).join('\n') || '✅ No issues'}

## Recommendations
${byType['missing-validation'].length > 0 ? '- Add validation to controller methods first' : ''}
${byType['n+1-query'].length > 0 ? '- Use eager loading (with) to prevent N+1 queries' : ''}
${byType['mass-assignment'].length > 0 ? '- Define $fillable or $guarded on all models' : ''}
${input.findings.length === 0 ? '✅ Laravel code looks good!' : ''}
`;
  
  return { report };
}
```
