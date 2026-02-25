# analyze-test

Test coverage and test structure analysis. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [2-code-analysis](../../../../docs/use-cases/auto-ai/2-code-analysis.md).

## Priority
75

## Triggers
- test analysis
- analyze tests
- coverage analysis

## Sub-actions

### 1. analyze-test-scan
Scan test files and summarize structure/coverage hints.

**Input:** rootDir  
**Output:** testFiles[], summary

```typescript
interface TestFile {
  path: string;
  framework: 'jest' | 'vitest' | 'phpunit' | 'pytest' | 'mocha' | 'unittest';
  testCount: number;
  hasSetup: boolean;
  hasTeardown: boolean;
}

interface TestSummary {
  totalTests: number;
  byFramework: Record<string, number>;
  coverageEstimate: string;
  missingTestDirs: string[];
}

export default async function run(input: { rootDir: string }): Promise<{ testFiles: TestFile[]; summary: TestSummary }> {
  const fs = await import('fs/promises');
  const path = await import('path');
  
  const testFiles: TestFile[] = [];
  const missingTestDirs: string[] = [];
  const byFramework: Record<string, number> = {};
  
  const testPatterns = [
    { pattern: /\.test\.(ts|js|tsx|jsx)$/, framework: 'jest' as const },
    { pattern: /\.spec\.(ts|js|tsx|jsx)$/, framework: 'vitest' as const },
    { pattern: /Test\.php$/, framework: 'phpunit' as const },
    { pattern: /_test\.py$/, framework: 'pytest' as const },
    { pattern: /\.test\.py$/, framework: 'pytest' as const },
    { pattern: /\.spec\.js$/, framework: 'mocha' as const },
  ];
  
  const srcDirs = new Set<string>();
  
  async function scanDir(dir: string, depth: number = 0): Promise<void> {
    if (depth > 8) return;
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'vendor', 'dist', 'build', 'coverage', '.next', '.nuxt'];
          if (!skipDirs.includes(entry.name) && !entry.name.startsWith('.')) {
            // Track src directories that might need tests
            const srcPattern = /^(src|source|app|lib)$/;
            if (srcPattern.test(entry.name)) {
              srcDirs.add(entry.name);
            }
            
            // Check if test directory exists alongside src
            const testDirPattern = /^(tests?|__tests__|specs?)$/;
            if (!testDirPattern.test(entry.name) && srcPattern.test(entry.name)) {
              // This is a src dir - check if corresponding test dir exists
              const siblingTestDir = path.join(dir, 'tests');
              try {
                await fs.access(siblingTestDir);
              } catch {
                missingTestDirs.push(path.relative(input.rootDir, fullPath));
              }
            }
            
            await scanDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          for (const { pattern, framework } of testPatterns) {
            if (pattern.test(entry.name)) {
              try {
                const content = await fs.readFile(fullPath, 'utf-8');
                
                // Count test functions/methods
                let testCount = 0;
                const testRegex = /(?:test|it|describe|function\s+test)\s*\(['"]?([^'"]+)/g;
                let match;
                while ((match = testRegex.exec(content)) !== null) {
                  testCount++;
                }
                
                const hasSetup = content.includes('beforeAll') || content.includes('beforeEach') || content.includes('setUp');
                const hasTeardown = content.includes('afterAll') || content.includes('afterEach') || content.includes('tearDown');
                
                testFiles.push({
                  path: path.relative(input.rootDir, fullPath),
                  framework,
                  testCount,
                  hasSetup,
                  hasTeardown
                });
                
                byFramework[framework] = (byFramework[framework] || 0) + testCount;
              } catch {
                // Skip unreadable files
              }
              break;
            }
          }
        }
      }
    } catch {
      // Skip inaccessible directories
    }
  }
  
  await scanDir(input.rootDir);
  
  const totalTests = Object.values(byFramework).reduce((a, b) => a + b, 0);
  const coverageEstimate = totalTests > 0 ? `${Math.min(100, Math.round(totalTests / 10))}% estimated` : 'No tests found';
  
  return {
    testFiles,
    summary: {
      totalTests,
      byFramework,
      coverageEstimate,
      missingTestDirs: missingTestDirs.slice(0, 5)
    }
  };
}
```

### 2. analyze-test-report
Report missing tests, coverage gaps.

**Input:** testFiles[], summary  
**Output:** report

```typescript
export default async function run(input: { 
  testFiles: Array<{ path: string; framework: string; testCount: number; hasSetup: boolean; hasTeardown: boolean }>;
  summary: { totalTests: number; byFramework: Record<string, number>; coverageEstimate: string; missingTestDirs: string[] };
}): Promise<{ report: string }> {
  const { testFiles, summary } = input;
  
  const filesWithManyTests = testFiles.filter(f => f.testCount > 10).slice(0, 5);
  const filesWithoutSetup = testFiles.filter(f => f.testCount > 5 && !f.hasSetup);
  
  const report = `# 🧪 Test Analysis Report

## Summary
- **Total Test Functions:** ${summary.totalTests}
- **Test Files:** ${testFiles.length}
- **Framework Distribution:** ${Object.entries(summary.byFramework).map(([fw, count]) => `${fw}: ${count}`).join(', ') || 'None detected'}
- **Estimated Coverage:** ${summary.coverageEstimate}

## Test File Structure

### Largest Test Files
${filesWithManyTests.map(f => `- \`${f.path}\`: ${f.testCount} tests`).join('\n') || 'N/A'}

### Files Without Setup (${filesWithoutSetup.length})
${filesWithoutSetup.slice(0, 5).map(f => `- \`${f.path}\` has ${f.testCount} tests but no beforeEach/beforeAll`).join('\n') || '✅ All tests have proper setup'}

## Missing Test Directories
${summary.missingTestDirs.length > 0 
  ? summary.missingTestDirs.map(d => `- \`${d}\` - no corresponding tests/ directory found`).join('\n')
  : '✅ All source directories have test directories'}

## Recommendations
${summary.totalTests === 0 ? '- 🚨 No tests found! Add test files immediately.' : ''}
${filesWithoutSetup.length > 0 ? `- Consider adding beforeEach/setup for ${filesWithoutSetup.length} test files` : ''}
${summary.missingTestDirs.length > 0 ? `- Create test directories for: ${summary.missingTestDirs.join(', ')}` : ''}
${summary.totalTests > 0 && summary.missingTestDirs.length === 0 && filesWithoutSetup.length === 0 ? '✅ Test structure looks good!' : ''}
`;
  
  return { report };
}
```
