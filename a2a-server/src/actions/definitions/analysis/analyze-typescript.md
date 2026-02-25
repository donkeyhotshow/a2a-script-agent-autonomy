# analyze-typescript

Анализ TypeScript: any types, missing props. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
72

## Triggers
- typescript analysis
- analyze typescript
- any types
- missing props

## Sub-actions

### 1. analyze-ts-scan
Scan TS/TSX for any, implicit any, missing props.

**Input:** rootDir  
**Output:** findings[]

```typescript
interface TSFinding {
  file: string;
  line: number;
  type: 'any-type' | 'implicit-any' | 'missing-prop-type' | 'unused-type' | 'unsafe-null-check' | 'no-infer-type';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export default async function run(input: { rootDir: string }): Promise<{ findings: TSFinding[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const findings: TSFinding[] = [];
  
  async function scanDir(dir: string, depth: number = 0): Promise<void> {
    if (depth > 8) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
          if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const relativePath = path.relative(input.rootDir, fullPath);
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const lineNum = i + 1;
              
              // Explicit any type annotation
              if (/: any\b/.test(line)) {
                findings.push({
                  file: relativePath,
                  line: lineNum,
                  type: 'any-type',
                  severity: 'warning',
                  message: 'Explicit ": any" type annotation found',
                  suggestion: 'Replace with proper type or use unknown'
                });
              }
              
              // Variable without type that could be implicit any
              const implicitAnyPattern = /(?:const|let|var)\s+(\w+)\s*=/;
              const implicitMatch = line.match(implicitAnyPattern);
              if (implicitMatch && !line.includes(':') && !line.includes('=') && lines[i + 1]?.includes('=')) {
                // This is a heuristic check
              }
              
              // Function parameters without types (excluding interfaces)
              const funcParamPattern = /function\s+\w+\s*\([^)]*\)|(?:\w+)\s*\([^)]*\)\s*=>|w+)\s*\(\s*\(\([^)]*\)/;
              if (line.includes('function') || line.includes('=>')) {
                const paramsMatch = line.match(/\([^)]+\)/);
                if (paramsMatch && !paramsMatch[0].includes(':')) {
                  findings.push({
                    file: relativePath,
                    line: lineNum,
                    type: 'implicit-any',
                    severity: 'warning',
                    message: 'Function parameter(s) missing type annotations',
                    suggestion: 'Add type annotations to function parameters'
                  });
                }
              }
              
              // React props without interface
              if ((line.includes('function') || line.includes('const')) && 
                  (line.includes('Props') || line.includes('props'))) {
                if (!content.includes('interface') && !content.includes('type') && 
                    !content.includes(': Props') && !line.includes('as ')) {
                  findings.push({
                    file: relativePath,
                    line: lineNum,
                    type: 'missing-prop-type',
                    severity: 'warning',
                    message: 'React component props without explicit type',
                    suggestion: 'Define interface or type for props'
                  });
                }
              }
              
              // Unsafe null checks
              if (line.includes('==') || line.includes('!=')) {
                findings.push({
                  file: relativePath,
                  line: lineNum,
                  type: 'unsafe-null-check',
                  severity: 'info',
                  message: 'Use === or !== for strict equality',
                  suggestion: 'Use strict equality operators'
                });
              }
              
              // Return type inference issues
              if (line.includes('function') && !line.includes(': ') && line.includes('{')) {
                findings.push({
                  file: relativePath,
                  line: lineNum,
                  type: 'no-infer-type',
                  severity: 'info',
                  message: 'Function without explicit return type',
                  suggestion: 'Consider adding explicit return type for better type safety'
                });
              }
            }
            
            // Check for unused interfaces/types
            const typeMatches = content.match(/(?:interface|type)\s+(\w+)/g) || [];
            const usedTypes = new Set<string>();
            
            const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            while ((match = importRegex.exec(content)) !== null) {
              if (match[1].startsWith('./') || match[1].startsWith('../')) {
                const importedFile = match[1].replace('.ts', '').replace('.tsx', '');
                usedTypes.add(importedFile);
              }
            }
            
            for (const typeMatch of typeMatches) {
              const typeName = typeMatch.replace(/(interface|type)\s+/, '');
              if (!content.includes(`useState<${typeName}`) && 
                  !content.includes(`: ${typeName}`) && 
                  !content.includes(`<${typeName}>`)) {
                findings.push({
                  file: relativePath,
                  line: 1,
                  type: 'unused-type',
                  severity: 'info',
                  message: `Potentially unused type: ${typeName}`,
                  suggestion: 'Remove if not used or export if needed'
                });
              }
            }
            
          } catch {
            // Skip unreadable files
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }
  
  await scanDir(input.rootDir);
  
  return { findings };
}
```

### 2. analyze-ts-report
**Input:** findings[]  
**Output:** report

```typescript
export default async function run(input: { findings: Array<{ file: string; line: number; type: string; severity: string; message: string; suggestion?: string }> }): Promise<{ report: string }> {
  const byType: Record<string, typeof input.findings> = {};
  const byFile: Record<string, number> = {};
  
  for (const f of input.findings) {
    if (!byType[f.type]) byType[f.type] = [];
    byType[f.type].push(f);
    byFile[f.file] = (byFile[f.file] || 0) + 1;
  }
  
  const topFiles = Object.entries(byFile)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  const report = `# 📘 TypeScript Analysis Report

## Summary
- **Total Issues:** ${input.findings.length}
- **Errors:** ${input.findings.filter(f => f.severity === 'error').length} 🔴
- **Warnings:** ${input.findings.filter(f => f.severity === 'warning').length} 🟡
- **Info:** ${input.findings.filter(f => f.severity === 'info').length} 🔵

## Top Files with Issues
${topFiles.map(([file, count]) => `- \`${file}\`: ${count} issues`).join('\n')}

## Issues by Type

### any-type (${byType['any-type']?.length || 0})
${byType['any-type']?.slice(0, 5).map(f => `- \`${f.file}:${f.line}\` ${f.message} - ${f.suggestion}`).join('\n') || '✅ None'}

### implicit-any (${byType['implicit-any']?.length || 0})
${byType['implicit-any']?.slice(0, 5).map(f => `- \`${f.file}:${f.line}\` ${f.message}`).join('\n') || '✅ None'}

### missing-prop-type (${byType['missing-prop-type']?.length || 0})
${byType['missing-prop-type']?.slice(0, 5).map(f => `- \`${f.file}:${f.line}\` ${f.message}`).join('\n') || '✅ None'}

## Recommendations
${byType['any-type']?.length ? '- Replace `: any` with proper types or `unknown`' : ''}
${byType['implicit-any']?.length ? '- Add type annotations to function parameters' : ''}
${byType['missing-prop-type']?.length ? '- Define TypeScript interfaces for React components' : ''}
${input.findings.length === 0 ? '✅ TypeScript code looks clean!' : ''}
`;
  
  return { report };
}
```
