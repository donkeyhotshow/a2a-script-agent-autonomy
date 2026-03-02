# hybrid-improve

Improve code using AI and best practices. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:
** [5-hybrid](../../../../docs/use-cases/auto-ai/5-hybrid.md).

## Priority

80

## Triggers

- improve code
- hybrid improve
- best practices

## Sub-actions

### 1. hybrid-improve-analyze

Analyze target and suggest improvements.

**Input:** target, context  
**Output:** suggestions[]

```typescript
import { readFile } from 'fs/promises';
import * as path from 'path';

interface ImprovementSuggestion {
  id: string;
  category: 'performance' | 'readability' | 'maintainability' | 'security' | 'type-safety';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  codeBefore?: string;
  codeAfter?: string;
}

export default async function run(input: { target: string; context?: unknown }): Promise<{ suggestions: ImprovementSuggestion[]; analysis: CodeAnalysis }> {
  const { target } = input;
  
  const targetPath = path.resolve(process.cwd(), target);
  let code = '';
  
  try {
    code = await readFile(targetPath, 'utf-8');
  } catch (e) {
    return { 
      suggestions: [], 
      analysis: { error: `Cannot read file: ${targetPath}` } 
    };
  }
  
  // Analyze code quality
  const analysis = analyzeCodeQuality(code, target);
  
  // Generate improvement suggestions based on analysis
  const suggestions = generateSuggestions(code, analysis);
  
  return { suggestions, analysis };
}

interface CodeAnalysis {
  lineCount: number;
  functionCount: number;
  classCount: number;
  cyclomaticComplexity: number;
  hasTypeAnnotations: boolean;
  hasDocumentation: boolean;
  issues: string[];
  error?: string;
}

function analyzeCodeQuality(code: string, target: string): CodeAnalysis {
  const lines = code.split('\n');
  const lineCount = lines.length;
  
  // Count functions
  const functionCount = (code.match(/(?:function\s+\w+|const\s+\w+\s*=|\w+\s*\([^)]*\)\s*=>)/g) || []).length;
  
  // Count classes
  const classCount = (code.match(/class\s+\w+/g) || []).length;
  
  // Check for type annotations
  const hasTypeAnnotations = code.includes(': string') || code.includes(': number') || code.includes(': boolean');
  
  // Check for documentation
  const hasDocumentation = code.includes('/**') || code.includes('///') || code.includes('JSDoc');
  
  // Calculate cyclomatic complexity (simplified)
  const complexityKeywords = ['if', 'else', 'for', 'while', 'case', 'catch', '&&', '||'];
  let cyclomaticComplexity = 1;
  for (const keyword of complexityKeywords) {
    cyclomaticComplexity += (code.match(new RegExp(keyword, 'g')) || []).length;
  }
  
  // Collect issues
  const issues: string[] = [];
  
  if (lineCount > 500) {
    issues.push('File exceeds 500 lines - consider splitting');
  }
  if (functionCount > 20) {
    issues.push('High function count - consider extracting utilities');
  }
  if (cyclomaticComplexity > 20) {
    issues.push('High cyclomatic complexity - code may be hard to test');
  }
  if (!hasTypeAnnotations) {
    issues.push('Missing type annotations');
  }
  if (!hasDocumentation) {
    issues.push('Missing documentation comments');
  }
  if (code.includes('console.log') && !code.includes('debug')) {
    issues.push('Contains console.log statements');
  }
  if (code.includes('any') && !code.includes(': any')) {
    issues.push('Uses "any" type - consider proper typing');
  }
  if (code.includes('var ')) {
    issues.push('Uses "var" - consider "let" or "const"');
  }
  
  return {
    lineCount,
    functionCount,
    classCount,
    cyclomaticComplexity,
    hasTypeAnnotations,
    hasDocumentation,
    issues
  };
}

function generateSuggestions(code: string, analysis: CodeAnalysis): ImprovementSuggestion[] {
  const suggestions: ImprovementSuggestion[] = [];
  let id = 1;
  
  // Type safety suggestions
  if (!analysis.hasTypeAnnotations) {
    suggestions.push({
      id: `imp-${id++}`,
      category: 'type-safety',
      title: 'Add TypeScript types',
      description: 'Add type annotations to improve type safety and catch errors at compile time.',
      impact: 'high',
      effort: 'medium',
      codeBefore: 'function process(data) { return data.value; }',
      codeAfter: 'function process(data: { value: string }): string { return data.value; }'
    });
  }
  
  // Documentation suggestions
  if (!analysis.hasDocumentation) {
    suggestions.push({
      id: `imp-${id++}`,
      category: 'maintainability',
      title: 'Add documentation',
      description: 'Add JSDoc comments to explain function purposes and parameters.',
      impact: 'medium',
      effort: 'low',
      codeBefore: 'function calculate(x, y) { return x + y; }',
      codeAfter: '/**\n * Adds two numbers\n * @param x - First number\n * @param y - Second number\n */\nfunction calculate(x: number, y: number): number { return x + y; }'
    });
  }
  
  // Performance: avoid console.log in production
  if (code.includes('console.log')) {
    suggestions.push({
      id: `imp-${id++}`,
      category: 'performance',
      title: 'Replace console.log with logger',
      description: 'Use a proper logging library for production code.',
      impact: 'medium',
      effort: 'low',
      codeBefore: 'console.log("debug", data);',
      codeAfter: 'logger.debug("debug", data);'
    });
  }
  
  // Security: input validation
  if (code.includes('eval(') || code.includes('new Function')) {
    suggestions.push({
      id: `imp-${id++}`,
      category: 'security',
      title: 'Remove dangerous code patterns',
      description: 'eval() and new Function() are security risks. Find alternatives.',
      impact: 'high',
      effort: 'low',
      codeBefore: 'eval(userInput);',
      codeAfter: '// Use a safe parser like JSON.parse()'
    });
  }
  
  // Readability: simplify complex conditions
  if (analysis.cyclomaticComplexity > 15) {
    suggestions.push({
      id: `imp-${id++}`,
      category: 'readability',
      title: 'Reduce complexity',
      description: 'Extract complex logic into smaller, named functions.',
      impact: 'medium',
      effort: 'medium'
    });
  }
  
  // Use const/let instead of var
  if (code.includes('var ')) {
    suggestions.push({
      id: `imp-${id++}`,
      category: 'maintainability',
      title: 'Replace var with const/let',
      description: 'Use const for values that never change, let for mutable values.',
      impact: 'medium',
      effort: 'low',
      codeBefore: 'var x = 10;',
      codeAfter: 'const x = 10;'
    });
  }
  
  // Error handling
  if (!code.includes('try') && !code.includes('catch')) {
    suggestions.push({
      id: `imp-${id++}`,
      category: 'maintainability',
      title: 'Add error handling',
      description: 'Wrap async operations and external calls in try-catch blocks.',
      impact: 'high',
      effort: 'medium'
    });
  }
  
  return suggestions;
}
```

### 2. hybrid-improve-apply

Apply selected improvements.

**Input:** suggestions[], target, selection?  
**Output:** applied[]

```typescript
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';

interface ImprovementSuggestion {
  id: string;
  category: 'performance' | 'readability' | 'maintainability' | 'security' | 'type-safety';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  codeBefore?: string;
  codeAfter?: string;
}

export default async function run(input: { suggestions: ImprovementSuggestion[]; target: string; selection?: number[] }): Promise<{ applied: AppliedResult[]; summary: string }> {
  const { suggestions, target, selection } = input;
  
  // Determine which suggestions to apply
  const toApply = selection 
    ? suggestions.filter((_, i) => selection.includes(i))
    : suggestions.filter(s => s.effort === 'low');
  
  if (toApply.length === 0) {
    return { applied: [], summary: 'No suggestions selected for application' };
  }
  
  const targetPath = path.resolve(process.cwd(), target);
  let code = '';
  
  try {
    code = await readFile(targetPath, 'utf-8');
  } catch (e) {
    return { 
      applied: [{ id: 'error', success: false, error: 'Cannot read target file' }], 
      summary: 'Failed to read target file' 
    };
  }
  
  const originalCode = code;
  const applied: AppliedResult[] = [];
  
  // Apply each improvement
  for (const suggestion of toApply) {
    try {
      if (suggestion.codeBefore && suggestion.codeAfter) {
        // Simple string replacement (for demonstration)
        // In production: use proper AST manipulation
        const newCode = code.replace(suggestion.codeBefore, suggestion.codeAfter);
        
        if (newCode !== code) {
          code = newCode;
          applied.push({
            id: suggestion.id,
            success: true,
            title: suggestion.title
          });
        } else {
          applied.push({
            id: suggestion.id,
            success: false,
            title: suggestion.title,
            error: 'Pattern not found in code'
          });
        }
      } else {
        // Suggestion requires manual intervention
        applied.push({
          id: suggestion.id,
          success: false,
          title: suggestion.title,
          error: 'Requires manual implementation'
        });
      }
    } catch (e) {
      applied.push({
        id: suggestion.id,
        success: false,
        title: suggestion.title,
        error: e instanceof Error ? e.message : 'Unknown error'
      });
    }
  }
  
  // Write changes if any were applied
  let summary = '';
  const successful = applied.filter(a => a.success);
  
  if (successful.length > 0) {
    try {
      await writeFile(targetPath, code, 'utf-8');
      summary = `Successfully applied ${successful.length} improvements to ${target}`;
    } catch (e) {
      summary = `Failed to write changes: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  } else {
    summary = `No improvements were applied. ${applied.length} suggestions require manual intervention.`;
  }
  
  return { applied, summary };
}

interface AppliedResult {
  id: string;
  success: boolean;
  title?: string;
  error?: string;
}
```
