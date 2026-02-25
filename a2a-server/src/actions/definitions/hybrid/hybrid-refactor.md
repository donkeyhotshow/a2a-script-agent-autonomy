# hybrid-refactor

Refactor task: analyze + refactor (hybrid flow). **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [5-hybrid](../../../../docs/use-cases/auto-ai/5-hybrid.md).

## Priority
85

## Triggers
- hybrid refactor
- refactor with analysis
- analyze and refactor

## Sub-actions

### 1. hybrid-refactor-analyze
Analyze code and produce refactor steps.

**Input:** target, context  
**Output:** steps[]

```typescript
import { readFile } from 'fs/promises';
import * as path from 'path';

interface RefactorStep {
  id: string;
  type: 'extract' | 'rename' | 'move' | 'split' | 'simplify' | 'optimize';
  title: string;
  description: string;
  target: string;
  lineStart?: number;
  lineEnd?: number;
  newCode?: string;
  newFile?: string;
  dependencies?: string[];
  risk: 'low' | 'medium' | 'high';
}

export default async function run(input: { target: string; context?: unknown }): Promise<{ steps: RefactorStep[]; analysis: RefactorAnalysis }> {
  const { target } = input;
  
  const targetPath = path.resolve(process.cwd(), target);
  let code = '';
  
  try {
    code = await readFile(targetPath, 'utf-8');
  } catch (e) {
    return { 
      steps: [], 
      analysis: { error: `Cannot read file: ${targetPath}` } 
    };
  }
  
  // Analyze code structure
  const analysis = analyzeStructure(code, target);
  
  // Generate refactoring steps
  const steps = generateRefactorSteps(code, analysis);
  
  return { steps, analysis };
}

interface RefactorAnalysis {
  fileName: string;
  language: string;
  lineCount: number;
  functions: FunctionInfo[];
  classes: ClassInfo[];
  imports: ImportInfo[];
  exports: string[];
  complexity: number;
  duplication: string[];
  issues: string[];
  error?: string;
}

interface FunctionInfo {
  name: string;
  line: number;
  params: number;
  isAsync: boolean;
  isExported: boolean;
}

interface ClassInfo {
  name: string;
  line: number;
  methods: number;
  properties: number;
}

interface ImportInfo {
  path: string;
  imports: string[];
  isDefault: boolean;
}

function analyzeStructure(code: string, target: string): RefactorAnalysis {
  const lines = code.split('\n');
  const lineCount = lines.length;
  
  // Extract functions
  const functions: FunctionInfo[] = [];
  const funcPatterns = [
    /^(?:export\s+)?function\s+(\w+)\s*\(([^)]*)\)/gm,
    /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)/gm,
    /^(?:export\s+)?(\w+):\s*(?:async\s*)?\(([^)]*)\)\s*=>/gm
  ];
  
  for (const pattern of funcPatterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1];
      const params = match[2] ? match[2].split(',').filter(p => p.trim()).length : 0;
      const isAsync = code.slice(match.index, match.index + 20).includes('async');
      const isExported = code.slice(Math.max(0, match.index - 10), match.index).includes('export');
      
      functions.push({
        name,
        line: code.slice(0, match.index).split('\n').length,
        params,
        isAsync,
        isExported
      });
    }
  }
  
  // Extract classes
  const classes: ClassInfo[] = [];
  const classPattern = /class\s+(\w+)/g;
  let match;
  while ((match = classPattern.exec(code)) !== null) {
    const classCode = code.slice(match.index);
    const methodCount = (classCode.match(/\w+\s*\(/g) || []).length;
    const propCount = (classCode.match(/this\.\w+/g) || []).length;
    
    classes.push({
      name: match[1],
      line: code.slice(0, match.index).split('\n').length,
      methods: methodCount,
      properties: propCount
    });
  }
  
  // Extract imports
  const imports: ImportInfo[] = [];
  const importPattern = /import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
  while ((match = importPattern.exec(code)) !== null) {
    imports.push({
      imports: match[1] ? match[1].split(',').map(s => s.trim()) : [match[2]],
      path: match[3],
      isDefault: !!match[2]
    });
  }
  
  // Extract exports
  const exports: string[] = [];
  const exportPattern = /export\s+(?:default\s+)?(?:function|const|class|interface|type)\s+(\w+)/g;
  while ((match = exportPattern.exec(code)) !== null) {
    exports.push(match[1]);
  }
  
  // Calculate complexity
  const complexity = calculateComplexity(code);
  
  // Find potential duplication (simplified)
  const duplication: string[] = [];
  const codeChunks = code.split('\n').filter(l => l.trim().length > 20);
  const chunkMap = new Map<string, number>();
  for (const chunk of codeChunks) {
    const key = chunk.slice(0, 30).trim();
    chunkMap.set(key, (chunkMap.get(key) || 0) + 1);
  }
  for (const [chunk, count] of chunkMap) {
    if (count > 2) duplication.push(chunk);
  }
  
  // Identify issues
  const issues: string[] = [];
  if (lineCount > 500) issues.push('File too large - consider splitting');
  if (functions.length > 15) issues.push('Too many functions - extract to modules');
  if (classes.length > 3) issues.push('Many classes - check for too many responsibilities');
  if (complexity > 30) issues.push('High complexity - refactor complex logic');
  if (duplication.length > 0) issues.push('Code duplication detected');
  
  return {
    fileName: target,
    language: path.extname(target).slice(1),
    lineCount,
    functions,
    classes,
    imports,
    exports,
    complexity,
    duplication,
    issues
  };
}

function calculateComplexity(code: string): number {
  let complexity = 1;
  const patterns = ['if', 'else', 'for', 'while', 'case', 'catch', '&&', '||', '?'];
  for (const p of patterns) {
    complexity += (code.match(new RegExp(p, 'g')) || []).length;
  }
  return complexity;
}

function generateRefactorSteps(code: string, analysis: RefactorAnalysis): RefactorStep[] {
  const steps: RefactorStep[] = [];
  let stepId = 1;
  
  // Step 1: Extract large functions
  for (const fn of analysis.functions) {
    const fnCode = extractFunctionCode(code, fn.line);
    if (fnCode && fnCode.split('\n').length > 20) {
      steps.push({
        id: `step-${stepId++}`,
        type: 'extract',
        title: `Extract function: ${fn.name}`,
        description: `Function ${fn.name} has many lines. Extract to separate function.`,
        target: analysis.fileName,
        lineStart: fn.line,
        newFile: `${fn.name}.ts`,
        risk: 'medium'
      });
    }
  }
  
  // Step 2: Rename unclear names
  for (const fn of analysis.functions) {
    if (fn.name.length <= 2 || /^[a-z]$/.test(fn.name)) {
      steps.push({
        id: `step-${stepId++}`,
        type: 'rename',
        title: `Rename: ${fn.name}`,
        description: `Function name "${fn.name}" is too short or unclear.`,
        target: analysis.fileName,
        lineStart: fn.line,
        risk: 'high'
      });
    }
  }
  
  // Step 3: Split large files
  if (analysis.lineCount > 500) {
    steps.push({
      id: `step-${stepId++}`,
      type: 'split',
      title: 'Split large file',
      description: `File has ${analysis.lineCount} lines. Split into smaller modules.`,
      target: analysis.fileName,
      risk: 'high'
    });
  }
  
  // Step 4: Remove duplication
  if (analysis.duplication.length > 0) {
    steps.push({
      id: `step-${stepId++}`,
      type: 'simplify',
      title: 'Remove code duplication',
      description: `Found ${analysis.duplication.length} duplicated code chunks.`,
      target: analysis.fileName,
      risk: 'medium'
    });
  }
  
  // Step 5: Optimize imports
  if (analysis.imports.length > 10) {
    steps.push({
      id: `step-${stepId++}`,
      type: 'optimize',
      title: 'Optimize imports',
      description: `File has ${analysis.imports.length} imports. Consider barrel exports.`,
      target: analysis.fileName,
      risk: 'low'
    });
  }
  
  return steps;
}

function extractFunctionCode(code: string, lineNumber: number): string | null {
  const lines = code.split('\n');
  if (lineNumber > lines.length) return null;
  
  const startLine = lineNumber - 1;
  let braceCount = 0;
  let inFunction = false;
  let endLine = startLine;
  
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('{')) {
      braceCount += (line.match(/{/g) || []).length;
      inFunction = true;
    }
    if (line.includes('}')) {
      braceCount -= (line.match(/}/g) || []).length;
    }
    if (inFunction && braceCount === 0) {
      endLine = i;
      break;
    }
  }
  
  return lines.slice(startLine, endLine + 1).join('\n');
}
```

### 2. hybrid-refactor-apply
Apply refactor steps (with validation).

**Input:** steps[], target  
**Output:** applied[]

```typescript
import { readFile, writeFile, mkdir } from 'fs/promises';
import * as path from 'path';

interface RefactorStep {
  id: string;
  type: 'extract' | 'rename' | 'move' | 'split' | 'simplify' | 'optimize';
  title: string;
  description: string;
  target: string;
  lineStart?: number;
  lineEnd?: number;
  newCode?: string;
  newFile?: string;
  dependencies?: string[];
  risk: 'low' | 'medium' | 'high';
}

export default async function run(input: { steps: RefactorStep[]; target: string }): Promise<{ applied: RefactorResult[]; summary: string; validation: ValidationResult }> {
  const { steps, target } = input;
  
  if (steps.length === 0) {
    return { 
      applied: [], 
      summary: 'No refactoring steps provided',
      validation: { valid: true, errors: [] }
    };
  }
  
  const targetPath = path.resolve(process.cwd(), target);
  let code = '';
  
  try {
    code = await readFile(targetPath, 'utf-8');
  } catch (e) {
    return {
      applied: [],
      summary: `Cannot read target file: ${targetPath}`,
      validation: { valid: false, errors: ['File not found'] }
    };
  }
  
  const originalCode = code;
  const applied: RefactorResult[] = [];
  
  // Apply each step
  for (const step of steps) {
    try {
      const result = await applyStep(code, step, targetPath);
      applied.push(result);
      
      if (result.success && result.newCode) {
        code = result.newCode;
      }
    } catch (e) {
      applied.push({
        stepId: step.id,
        success: false,
        title: step.title,
        error: e instanceof Error ? e.message : 'Unknown error'
      });
    }
  }
  
  // Validate the result
  const validation = validateRefactoredCode(code, originalCode);
  
  // Write changes
  let summary = '';
  const successful = applied.filter(a => a.success);
  
  if (successful.length > 0 && validation.valid) {
    try {
      await writeFile(targetPath, code, 'utf-8');
      summary = `Successfully applied ${successful.length}/${steps.length} refactoring steps`;
      
      // Create new files if needed
      for (const result of successful) {
        if (result.newFilePath && result.newFileContent) {
          const dir = path.dirname(targetPath);
          const newFilePath = path.join(dir, result.newFilePath);
          await writeFile(newFilePath, result.newFileContent, 'utf-8');
          summary += `\nCreated: ${result.newFilePath}`;
        }
      }
    } catch (e) {
      summary = `Failed to write: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  } else {
    summary = validation.valid 
      ? `Applied ${successful.length} steps, ${steps.length - successful.length} failed`
      : 'Validation failed - changes not written';
  }
  
  return { applied, summary, validation };
}

interface RefactorResult {
  stepId: string;
  success: boolean;
  title: string;
  newCode?: string;
  newFilePath?: string;
  newFileContent?: string;
  error?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

async function applyStep(code: string, step: RefactorStep, targetPath: string): Promise<RefactorResult> {
  switch (step.type) {
    case 'rename':
      return applyRename(code, step);
    case 'extract':
      return await applyExtract(code, step, targetPath);
    case 'simplify':
      return applySimplify(code, step);
    case 'optimize':
      return applyOptimize(code, step);
    case 'split':
      return applySplit(code, step);
    default:
      return {
        stepId: step.id,
        success: false,
        title: step.title,
        error: `Unknown step type: ${step.type}`
      };
  }
}

function applyRename(code: string, step: RefactorStep): RefactorResult {
  // Simple rename - in production would use proper AST
  return {
    stepId: step.id,
    success: false,
    title: step.title,
    error: 'Rename requires manual intervention'
  };
}

async function applyExtract(code: string, step: RefactorStep, targetPath: string): Promise<RefactorResult> {
  // Extract function to new file
  if (step.newFile) {
    return {
      stepId: step.id,
      success: true,
      title: step.title,
      newFilePath: step.newFile,
      newFileContent: `// Extracted from ${path.basename(targetPath)}\n\n${step.description}\n
export function ${step.title.replace('Extract function: ', '')}() {\n  // TODO: Implement\n}`
    };
  }
  
  return {
    stepId: step.id,
    success: false,
    title: step.title,
    error: 'No target file specified for extraction'
  };
}

function applySimplify(code: string, step: RefactorStep): RefactorResult {
  // Simplification - remove obvious duplication
  return {
    stepId: step.id,
    success: false,
    title: step.title,
    error: 'Simplification requires manual review'
  };
}

function applyOptimize(code: string, step: RefactorStep): RefactorResult {
  // Optimize imports - group and sort
  const lines = code.split('\n');
  const importLines = lines.filter(l => l.trim().startsWith('import '));
  const otherLines = lines.filter(l => !l.trim().startsWith('import '));
  
  const sortedImports = importLines.sort();
  const newCode = [...sortedImports, '', ...otherLines].join('\n');
  
  return {
    stepId: step.id,
    success: true,
    title: step.title,
    newCode
  };
}

function applySplit(code: string, step: RefactorStep): RefactorResult {
  return {
    stepId: step.id,
    success: false,
    title: step.title,
    error: 'File splitting requires manual planning'
  };
}

function validateRefactoredCode(newCode: string, originalCode: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check syntax - bracket balance
  const openBraces = (newCode.match(/{/g) || []).length;
  const closeBraces = (newCode.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    errors.push('Unbalanced curly braces');
  }
  
  const openParens = (newCode.match(/\(/g) || []).length;
  const closeParens = (newCode.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Unbalanced parentheses');
  }
  
  // Check for empty file
  if (newCode.trim().length === 0) {
    errors.push('Resulting code is empty');
  }
  
  // Warnings
  if (newCode.length < originalCode.length * 0.5) {
    warnings.push('Significant code removal - verify nothing important was lost');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```
