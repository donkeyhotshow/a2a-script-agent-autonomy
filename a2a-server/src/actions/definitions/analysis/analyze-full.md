# analyze-full

Полный анализ проекта: запуск всех активных нейронов. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
80

## Triggers
- full analysis
- analyze project
- project analysis
- проанализируй проект
- найди проблемы

## Sub-actions

### 1. analyze-collect
Сбор файлов для анализа.

**Input:** rootDir  
**Output:** files[]

```typescript
interface FileInfo {
  path: string;
  extension: string;
  size: number;
  modified: Date;
}

export default async function run(input: { rootDir: string }): Promise<{ files: FileInfo[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const files: FileInfo[] = [];
  const allowedExtensions = ['.ts', '.js', '.tsx', '.jsx', '.vue', '.php', '.py', '.java', '.cs', '.go', '.rs'];
  
  async function scanDir(dir: string, depth: number = 0): Promise<void> {
    if (depth > 10) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip common non-source directories
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'dist', 'build', 'vendor', '__pycache__', 'target', '.next', '.nuxt'];
          if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (allowedExtensions.includes(ext)) {
            try {
              const stats = await fs.stat(fullPath);
              files.push({
                path: path.relative(input.rootDir, fullPath),
                extension: ext,
                size: stats.size,
                modified: stats.mtime
              });
            } catch {
              // Skip files that can't be accessed
            }
          }
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }
  
  await scanDir(input.rootDir);
  
  return { files };
}
```

### 2. analyze-detect
Запуск детекторов (нейроны, паттерны).

**Input:** files[]  
**Output:** raw_findings[]

```typescript
interface Finding {
  file: string;
  line?: number;
  category: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  pattern?: string;
}

export default async function run(input: { files: Array<{ path: string; extension: string }> }): Promise<{ raw_findings: Finding[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const findings: Finding[] = [];
  const rootDir = process.cwd();
  
  // Common code smell patterns to detect
  const patterns = {
    'console.log': { severity: 'info' as const, message: 'Console.log found - remove in production' },
    'TODO': { severity: 'warning' as const, message: 'TODO comment found' },
    'FIXME': { severity: 'warning' as const, message: 'FIXME comment found' },
    'any': { severity: 'warning' as const, message: 'Using any type - consider typing properly' },
    '@ts-ignore': { severity: 'warning' as const, message: 'ts-ignore found - type checking bypassed' },
    'eval(': { severity: 'error' as const, message: 'eval() usage detected - security risk' },
    'password': { severity: 'error' as const, message: 'Potential hardcoded password detected' },
    'secret': { severity: 'error' as const, message: 'Potential hardcoded secret detected' },
    'apiKey': { severity: 'error' as const, message: 'Potential hardcoded API key detected' },
  };
  
  for (const file of input.files.slice(0, 100)) {
    try {
      const content = await fs.readFile(path.join(rootDir, file.path), 'utf-8');
      const lines = content.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        for (const [pattern, info] of Object.entries(patterns)) {
          if (line.toLowerCase().includes(pattern.toLowerCase())) {
            findings.push({
              file: file.path,
              line: i + 1,
              category: 'code-smell',
              severity: info.severity,
              message: info.message,
              pattern
            });
          }
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }
  
  return { raw_findings: findings };
}
```

### 3. analyze-aggregate
Агрегация результатов по файлам/типам.

**Input:** raw_findings[]  
**Output:** aggregated

```typescript
interface AggregatedData {
  byFile: Record<string, Array<{ line?: number; category: string; severity: string; message: string }>>;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  total: number;
}

export default async function run(input: { raw_findings: Array<{ file: string; line?: number; category: string; severity: string; message: string }> }): Promise<{ aggregated: AggregatedData }> {
  const aggregated: AggregatedData = {
    byFile: {},
    byCategory: {},
    bySeverity: {},
    total: input.raw_findings.length
  };
  
  for (const finding of input.raw_findings) {
    if (!aggregated.byFile[finding.file]) {
      aggregated.byFile[finding.file] = [];
    }
    aggregated.byFile[finding.file].push({
      line: finding.line,
      category: finding.category,
      severity: finding.severity,
      message: finding.message
    });
    
    aggregated.byCategory[finding.category] = (aggregated.byCategory[finding.category] || 0) + 1;
    aggregated.bySeverity[finding.severity] = (aggregated.bySeverity[finding.severity] || 0) + 1;
  }
  
  return { aggregated };
}
```

### 4. analyze-prioritize
Приоритизация по критичности.

**Input:** aggregated  
**Output:** prioritized[]

```typescript
interface PrioritizedItem {
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  priority: number;
}

export default async function run(input: { aggregated: { byFile: Record<string, Array<{ line?: number; category: string; severity: string; message: string }>>; bySeverity: Record<string, number> } }): Promise<{ prioritized: PrioritizedItem[] }> {
  const severityOrder = { error: 0, warning: 1, info: 2 };
  const prioritized: PrioritizedItem[] = [];
  
  for (const [file, findings] of Object.entries(input.aggregated.byFile)) {
    for (const finding of findings) {
      prioritized.push({
        file,
        line: finding.line,
        message: finding.message,
        severity: finding.severity as 'error' | 'warning' | 'info',
        category: finding.category,
        priority: severityOrder[finding.severity as keyof typeof severityOrder] || 2
      });
    }
  }
  
  prioritized.sort((a, b) => a.priority - b.priority);
  
  return { prioritized };
}
```

### 5. analyze-report
Формирование отчёта.

**Input:** prioritized[]  
**Output:** report

```typescript
export default async function run(input: { prioritized: Array<{ file: string; line?: number; message: string; severity: string; category: string }> }): Promise<{ report: string }> {
  const counts = { error: 0, warning: 0, info: 0 };
  const fileCounts = new Map<string, number>();
  
  for (const item of input.prioritized) {
    counts[item.severity as keyof typeof counts]++;
    fileCounts.set(item.file, (fileCounts.get(item.file) || 0) + 1);
  }
  
  const topFiles = Array.from(fileCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));
  
  const report = `# 📊 Full Project Analysis Report

## Summary
- **Total Issues:** ${input.prioritized.length}
- **Errors:** ${counts.error} 🔴
- **Warnings:** ${counts.warning} 🟡
- **Info:** ${counts.info} 🔵

## Top Files with Issues
${topFiles.map(f => `- **${f.file}**: ${f.count} issues`).join('\n')}

## Critical Issues (Errors)
${input.prioritized.filter(i => i.severity === 'error').slice(0, 20).map(i => `- \`${i.file}:${i.line || '?'}\` - ${i.message}`).join('\n') || 'No errors found'}

## Recommendations
${counts.error > 0 ? 'Fix critical errors first before proceeding.' : counts.warning > 0 ? 'Address warnings to improve code quality.' : 'Code looks good! Consider adding more tests.'}
`;
  
  return { report };
}
```
