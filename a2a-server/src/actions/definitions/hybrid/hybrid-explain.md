# hybrid-explain

Explain code with AI and context. **План:
** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:
** [5-hybrid](../../../../docs/use-cases/auto-ai/5-hybrid.md).

## Priority

75

## Triggers

- explain code
- hybrid explain
- what does this do

## Sub-actions

### 1. hybrid-explain-context

Gather code and related context.

**Input:** target, rootDir?  
**Output:** context

```typescript
import { readFile } from 'fs/promises';
import { glob } from 'glob';
import * as path from 'path';

export default async function run(input: { target: string; rootDir?: string }): Promise<{ context: CodeContext }> {
  const { target, rootDir = process.cwd() } = input;
  
  // Read target file
  const targetPath = path.resolve(rootDir, target);
  let code = '';
  try {
    code = await readFile(targetPath, 'utf-8');
  } catch (e) {
    return { context: { error: `File not found: ${targetPath}` } };
  }
  
  // Find related files (same directory, imports)
  const dir = path.dirname(targetPath);
  const related = await glob('*.{ts,js,tsx,jsx}', { cwd: dir, ignore: ['*.test.*', '*.spec.*'] });
  
  // Extract imports/exports for dependency graph
  const importRegex = /import\s+.*?from\s+['"](.+?)['"]/g;
  const imports: string[] = [];
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[1]);
  }
  
  return {
    context: {
      target,
      targetPath,
      code,
      codeLength: code.length,
      lineCount: code.split('\n').length,
      relatedFiles: related.slice(0, 10),
      imports,
      language: path.extname(target).slice(1)
    }
  };
}

interface CodeContext {
  target: string;
  targetPath: string;
  code: string;
  codeLength: number;
  lineCount: number;
  relatedFiles: string[];
  imports: string[];
  language: string;
  error?: string;
}
```

### 2. hybrid-explain-llm

Generate explanation via AI.

**Input:** context  
**Output:** explanation

```typescript
interface CodeContext {
  target: string;
  targetPath: string;
  code: string;
  codeLength: number;
  lineCount: number;
  relatedFiles: string[];
  imports: string[];
  language: string;
}

export default async function run(input: { context: CodeContext }): Promise<{ explanation: string }> {
  const { context } = input;
  
  if (context.error) {
    return { explanation: `Error: ${context.error}` };
  }
  
  // Build prompt for AI explanation
  const prompt = buildExplainPrompt(context);
  
  // Call AI (simulated - in real implementation would use LLM client)
  const explanation = await callAIExplain(prompt, context);
  
  return { explanation };
}

function buildExplainPrompt(ctx: CodeContext): string {
  const sections = [
    `## File: ${ctx.target}`,
    `## Language: ${ctx.language}`,
    `## Lines: ${ctx.lineCount}`,
    '## Code:',
    '```' + ctx.language,
    ctx.code,
    '```',
  ];
  
  if (ctx.imports.length > 0) {
    sections.push('## Imports:', ...ctx.imports.map(i => `- ${i}`));
  }
  
  if (ctx.relatedFiles.length > 0) {
    sections.push('## Related Files:', ...ctx.relatedFiles.map(f => `- ${f}`));
  }
  
  sections.push('## Task:',
    'Provide a clear explanation covering:',
    '1. What this code does (summary)',
    '2. Key functions/classes and their purpose',
    '3. How data flows through the code',
    '4. Any important patterns or patterns to avoid',
    '5. Potential issues or improvements'
  );
  
  return sections.join('\n\n');
}

async function callAIExplain(prompt: string, context: CodeContext): Promise<string> {
  // In production, this would call the LLM
  // For now, return structured explanation based on static analysis
  
  const lines = context.code.split('\n');
  const functions = extractFunctions(context.code, context.language);
  const classes = extractClasses(context.code);
  
  let explanation = `# Explanation: ${context.target}\n\n`;
  
  // Summary section
  explanation += `## Summary\n`;
  explanation += `This is a ${context.language} file with ${context.lineCount} lines, `;
  explanation += `containing ${functions.length} functions and ${classes.length} classes.\n\n`;
  
  // Functions
  if (functions.length > 0) {
    explanation += `## Functions\n`;
    for (const fn of functions) {
      explanation += `- **${fn.name}**: ${fn.description || 'function definition'}\n`;
    }
    explanation += '\n';
  }
  
  // Classes
  if (classes.length > 0) {
    explanation += `## Classes\n`;
    for (const cls of classes) {
      explanation += `- **${cls.name}**: ${cls.description || 'class definition'}\n`;
    }
    explanation += '\n';
  }
  
  // Imports
  if (context.imports.length > 0) {
    explanation += `## Dependencies\n`;
    explanation += `This file imports: ${context.imports.join(', ')}\n\n`;
  }
  
  explanation += `## Code Structure\n`;
  explanation += `- Total lines: ${context.lineCount}\n`;
  explanation += `- Code size: ${context.codeLength} characters\n`;
  explanation += `- Related files: ${context.relatedFiles.length}\n\n`;
  
  explanation += `## Note\n`;
  explanation += `Run with AI integration enabled for detailed AI-powered explanation.`;
  
  return explanation;
}

function extractFunctions(code: string, language: string): Array<{ name: string; description: string }> {
  const functions: Array<{ name: string; description: string }> = [];
  
  // TypeScript/JavaScript function patterns
  const patterns = [
    /function\s+(\w+)\s*\([^)]*\)/g,
    /(\w+)\s*\([^)]*\)\s*\{/g,
    /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
    /(\w+):\s*(?:async\s*)?\([^)]*\)\s*=>/g
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      if (!functions.find(f => f.name === match[1])) {
        functions.push({ name: match[1], description: 'function' });
      }
    }
  }
  
  return functions.slice(0, 20); // Limit to 20 functions
}

function extractClasses(code: string): Array<{ name: string; description: string }> {
  const classes: Array<{ name: string; description: string }> = [];
  const classPattern = /class\s+(\w+)/g;
  let match;
  
  while ((match = classPattern.exec(code)) !== null) {
    classes.push({ name: match[1], description: 'class' });
  }
  
  return classes;
}
```
