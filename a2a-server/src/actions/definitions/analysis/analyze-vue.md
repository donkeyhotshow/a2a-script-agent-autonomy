# analyze-vue

Анализ Vue: prop drilling, Options API, a11y. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
72

## Triggers
- vue analysis
- analyze vue
- prop drilling
- options api
- a11y

## Sub-actions

### 1. analyze-vue-scan
Scan Vue files for patterns (prop drilling, Options API, a11y).

**Input:** rootDir  
**Output:** findings[]

```typescript
interface VueFinding {
  file: string;
  line: number;
  type: 'prop-drilling' | 'options-api' | 'missing-a11y' | 'v-html' | 'missing-key' | 'ref-mutation' | 'reactive-mutation';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export default async function run(input: { rootDir: string }): Promise<{ findings: VueFinding[] }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const findings: VueFinding[] = [];
  
  async function scanDir(dir: string, depth: number = 0): Promise<void> {
    if (depth > 8) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'dist', 'build'];
          if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            await scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile() && (entry.name.endsWith('.vue') || entry.name.endsWith('.js'))) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const relativePath = path.relative(input.rootDir, fullPath);
            const lines = content.split('\n');
            
            // Check for Options API vs Composition API
            const hasOptions = content.includes('data()') || content.includes('methods:') || content.includes('computed:');
            const hasComposition = content.includes('script setup') || content.includes('ref(') || content.includes('reactive(');
            
            if (hasOptions && !hasComposition) {
              findings.push({
                file: relativePath,
                line: 1,
                type: 'options-api',
                severity: 'info',
                message: 'Component uses Options API. Consider migrating to Composition API (script setup)',
                suggestion: 'Use <script setup> with ref/reactive for better TypeScript support and code organization'
              });
            }
            
            // Check for v-html (XSS risk)
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].includes('v-html')) {
                findings.push({
                  file: relativePath,
                  line: i + 1,
                  type: 'v-html',
                  severity: 'warning',
                  message: 'v-html directive found - potential XSS risk',
                  suggestion: 'Sanitize content or use v-text instead'
                });
              }
              
              // Check for missing :key on v-for
              if (lines[i].includes('v-for') && !lines[i].includes(':key')) {
                findings.push({
                  file: relativePath,
                  line: i + 1,
                  type: 'missing-key',
                  severity: 'warning',
                  message: 'v-for without :key binding',
                  suggestion: 'Add :key with unique identifier'
                });
              }
              
              // Check for missing accessibility attributes
              const imgMatch = lines[i].match(/<img[^>]*>/);
              if (imgMatch && !imgMatch[0].includes('alt=')) {
                findings.push({
                  file: relativePath,
                  line: i + 1,
                  type: 'missing-a11y',
                  severity: 'error',
                  message: 'Image missing alt attribute',
                  suggestion: 'Add alt="" for decorative or alt="description" for meaningful images'
                });
              }
              
              // Check for buttons without accessible labels
              const buttonMatch = lines[i].match(/<button[^>]*>/);
              if (buttonMatch && !buttonMatch[0].includes('aria-') && !buttonMatch[0].includes('>')) {
                findings.push({
                  file: relativePath,
                  line: i + 1,
                  type: 'missing-a11y',
                  severity: 'warning',
                  message: 'Button may lack accessible label',
                  suggestion: 'Add aria-label or use inner text'
                });
              }
              
              // Check for input without label
              const inputMatch = lines[i].match(/<input[^>]*>/);
              if (inputMatch && !inputMatch[0].includes('id=')) {
                findings.push({
                  file: relativePath,
                  line: i + 1,
                  type: 'missing-a11y',
                  severity: 'warning',
                  message: 'Input element may lack accessible label',
                  suggestion: 'Add label or aria-label'
                });
              }
            }
            
            // Check for prop drilling (passing props through many levels)
            const propsMatch = content.match(/props:\s*{[^}]*}/);
            if (propsMatch) {
              const propCount = (propsMatch[0].match(/\w+:/g) || []).length;
              if (propCount > 7) {
                findings.push({
                  file: relativePath,
                  line: 1,
                  type: 'prop-drilling',
                  severity: 'warning',
                  message: `Component has ${propCount} props - potential prop drilling`,
                  suggestion: 'Consider using provide/inject or Vuex/Pinia for shared state'
                });
              }
            }
            
            // Check for direct ref mutation in Composition API
            const refMutationPattern = /\w+\.value\s*=/g;
            let match;
            const functionMatches = content.match(/(?:function|const|let)\s+\w+\s*[=(]/g) || [];
            
            if (hasComposition) {
              // This is a basic heuristic check
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('.value =') && (lines[i + 1]?.includes('push') || lines[i + 1]?.includes('splice'))) {
                  findings.push({
                    file: relativePath,
                    line: i + 1,
                    type: 'reactive-mutation',
                    severity: 'warning',
                    message: 'Direct mutation of reactive array',
                    suggestion: 'Use const arr = ref([...newVal]) or arr.value = [...arr.value, newItem]'
                  });
                }
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

### 2. analyze-vue-report
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
  
  const severityEmoji: Record<string, string> = {
    error: '🔴',
    warning: '🟡',
    info: '🔵'
  };
  
  const report = `# 🎨 Vue Analysis Report

## Summary
- **Total Issues:** ${input.findings.length}
${Object.entries(byType).map(([type, items]) => `- **${type}:** ${items.length}`).join('\n')}

## Issues by Category

### Accessibility (${byType['missing-a11y']?.length || 0})
${byType['missing-a11y']?.slice(0, 5).map(f => 
  `- \`${f.file}:${f.line}\` ${severityEmoji[f.severity]} ${f.message}`
).join('\n') || '✅ No a11y issues'}

### Options API (${byType['options-api']?.length || 0})
${byType['options-api']?.slice(0, 5).map(f => 
  `- \`${f.file}:${f.line}\` ${f.message}`
).join('\n') || '✅ Using Composition API'}

### Prop Drilling (${byType['prop-drilling']?.length || 0})
${byType['prop-drilling']?.slice(0, 5).map(f => 
  `- \`${f.file}:${f.line}\` ${f.message}`
).join('\n') || '✅ No prop drilling detected'}

### v-html (${byType['v-html']?.length || 0})
${byType['v-html']?.slice(0, 5).map(f => 
  `- \`${f.file}:${f.line}\` ${severityEmoji[f.severity]} ${f.message}`
).join('\n') || '✅ No v-html usage'}

### Missing :key (${byType['missing-key']?.length || 0})
${byType['missing-key']?.slice(0, 5).map(f => 
  `- \`${f.file}:${f.line}\` ${severityEmoji[f.severity]} ${f.message}`
).join('\n') || '✅ All v-for have keys'}

## Recommendations
${byType['missing-a11y']?.length ? '- Add accessibility attributes (alt, aria-*, labels)' : ''}
${byType['options-api']?.length ? '- Consider migrating to Composition API (script setup)' : ''}
${byType['prop-drilling']?.length ? '- Use provide/inject or Pinia for shared state' : ''}
${byType['v-html']?.length ? '- Sanitize content or use v-text instead of v-html' : ''}
${input.findings.length === 0 ? '✅ Vue code looks great!' : ''}
`;
  
  return { report };
}
```
