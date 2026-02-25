# hybrid-fix

Исправление проблем: Analyze → AI → Validate → Apply. **План:** [actions-definitions-for-auto-ai](../../../../plans/actions-definitions-for-auto-ai.md). **Use-case:** [5-hybrid](../../../../docs/use-cases/auto-ai/5-hybrid.md).

## Priority
85

## Triggers
- hybrid fix
- fix with analysis
- analyze and fix
- исправь n+1
- почини ошибку

## Sub-actions

### 1. hybrid-collect
Сбор контекста (RAG + Graph).

**Input:** target, rootDir?  
**Output:** context

```typescript
import { readFile } from 'fs/promises';
import * as path from 'path';

interface FixContext {
  target: string;
  targetPath: string;
  code: string;
  originalCode: string;
  errors: string[];
  lineCount: number;
}

export default async function run(input: { target: string; rootDir?: string }): Promise<{ context: FixContext }> {
  const { target, rootDir = process.cwd() } = input;
  const targetPath = path.resolve(rootDir, target);
  
  let code = '';
  let originalCode = '';
  let errors: string[] = [];
  
  try {
    originalCode = await readFile(targetPath, 'utf-8');
    code = originalCode;
  } catch (e) {
    errors.push(`Cannot read file: ${targetPath}`);
  }
  
  return {
    context: {
      target,
      targetPath,
      code,
      originalCode,
      errors,
      lineCount: code.split('\n').length
    }
  };
}
```

### 2. hybrid-prompt
Формирование промпта для AI.

**Input:** target, context  
**Output:** prompt

```typescript
interface FixContext {
  target: string;
  targetPath: string;
  code: string;
  originalCode: string;
  errors: string[];
  lineCount: number;
}

export default async function run(input: { target: string; context: FixContext }): Promise<{ prompt: string }> {
  const { target, context } = input;
  
  const sections = [
    '# Code Fix Request',
    `## Target File: ${target}`,
    `## Path: ${context.targetPath}`,
    `## Line Count: ${context.lineCount}`,
    '',
    '## Current Code:',
    '```typescript',
    context.code,
    '```',
  ];
  
  if (context.errors.length > 0) {
    sections.push('', '## Errors:', ...context.errors.map(e => `- ${e}`));
  }
  
  sections.push('',
    '## Task:',
    'Analyze the code and provide specific fixes for any issues found.',
    'Return your response in the following JSON format:',
    '',
    '```json',
    '{',
    '  "fixes": [',
    '    {',
    '      "file": "relative/path.ts",',
    '      "type": "replace|add|remove",',
    '      "line": 42,',
    '      "original": "old code",',
    '      "replacement": "new code",',
    '      "reason": "description of fix"',
    '    }',
    '  ],',
    '  "explanation": "Overall explanation of changes"',
    '}',
    '```'
  );
  
  return { prompt: sections.join('\n') };
}
```

### 3. hybrid-analyze
Вызов AI для предложений исправлений.

**Input:** prompt  
**Output:** raw_response

```typescript
interface Fix {
  file: string;
  type: 'replace' | 'add' | 'remove';
  line: number;
  original: string;
  replacement: string;
  reason: string;
}

export default async function run(input: { prompt: string }): Promise<{ raw_response: string }> {
  const { prompt } = input;
  
  // In production: call LLM with the prompt
  // For now: simulate AI analysis with static checks
  
  const checks = performStaticAnalysis(prompt);
  
  const response = {
    fixes: checks.fixes,
    explanation: checks.explanation,
    confidence: checks.confidence
  };
  
  return { raw_response: JSON.stringify(response, null, 2) };
}

interface StaticAnalysisResult {
  fixes: Fix[];
  explanation: string;
  confidence: number;
}

function performStaticAnalysis(prompt: string): StaticAnalysisResult {
  const fixes: Fix[] = [];
  let explanation = 'Static analysis complete.';
  let confidence = 0.7;
  
  // Check for common issues
  if (prompt.includes('TODO') || prompt.includes('FIXME')) {
    fixes.push({
      file: '',
      type: 'replace',
      line: 1,
      original: '// TODO',
      replacement: '// TODO: addressed',
      reason: 'Marked TODO for tracking'
    });
  }
  
  // Check for console.log in production code
  if (prompt.includes('console.log') && !prompt.includes('debug')) {
    explanation += ' Found console.log statements that should be removed or replaced with proper logging.';
    confidence = 0.85;
  }
  
  // Check for any/unknow types
  if (prompt.includes(': any') || prompt.includes(': unknown')) {
    explanation += ' Found type safety issues with any/unknown types.';
    fixes.push({
      file: '',
      type: 'replace',
      line: 1,
      original: ': any',
      replacement: ': unknown',
      reason: 'Prefer unknown over any for type safety'
    });
  }
  
  return { fixes, explanation, confidence };
}
```

### 4. hybrid-parse
Парсинг ответа AI (блоки кода, патчи).

**Input:** raw_response  
**Output:** patches[]

```typescript
interface Fix {
  file: string;
  type: 'replace' | 'add' | 'remove';
  line: number;
  original: string;
  replacement: string;
  reason: string;
}

interface ParsedResponse {
  fixes: Fix[];
  explanation: string;
  confidence?: number;
}

export default async function run(input: { raw_response: string }): Promise<{ patches: Patch[] }> {
  const { raw_response } = input;
  
  let parsed: ParsedResponse;
  
  try {
    parsed = JSON.parse(raw_response);
  } catch (e) {
    // Try to extract JSON from response
    const jsonMatch = raw_response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return { patches: [], parseError: 'Invalid JSON in response' };
      }
    } else {
      return { patches: [], parseError: 'No valid JSON found' };
    }
  }
  
  const patches: Patch[] = (parsed.fixes || []).map((fix, idx) => ({
    id: `patch-${idx}`,
    file: fix.file,
    type: fix.type,
    line: fix.line,
    original: fix.original,
    replacement: fix.replacement,
    reason: fix.reason,
    applied: false
  }));
  
  return { patches, explanation: parsed.explanation };
}

interface Patch {
  id: string;
  file: string;
  type: 'replace' | 'add' | 'remove';
  line: number;
  original: string;
  replacement: string;
  reason: string;
  applied: boolean;
}
```

### 5. hybrid-validate
Валидация изменений (синтаксис, линт).

**Input:** patches[]  
**Output:** valid_patches[], errors[]

```typescript
interface Patch {
  id: string;
  file: string;
  type: 'replace' | 'add' | 'remove';
  line: number;
  original: string;
  replacement: string;
  reason: string;
  applied: boolean;
}

export default async function run(input: { patches: Patch[] }): Promise<{ valid_patches: Patch[]; errors: string[] }> {
  const { patches } = input;
  const valid_patches: Patch[] = [];
  const errors: string[] = [];
  
  for (const patch of patches) {
    // Validate patch has required fields
    if (!patch.replacement && patch.type !== 'remove') {
      errors.push(`Patch ${patch.id}: missing replacement code`);
      continue;
    }
    
    // Check for empty patches
    if (!patch.replacement.trim() && patch.type !== 'remove') {
      errors.push(`Patch ${patch.id}: empty replacement`);
      continue;
    }
    
    // Validate syntax (basic checks)
    const syntaxErrors = validateSyntax(patch.replacement, patch.type);
    if (syntaxErrors.length > 0) {
      errors.push(`Patch ${patch.id}: ${syntaxErrors.join(', ')}`);
      continue;
    }
    
    valid_patches.push(patch);
  }
  
  return { valid_patches, errors };
}

function validateSyntax(code: string, type: string): string[] {
  const errors: string[] = [];
  
  if (!code) return errors;
  
  // Check bracket balance
  const openBrackets = (code.match(/\{/g) || []).length;
  const closeBrackets = (code.match(/\}/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push('Unbalanced curly braces');
  }
  
  // Check parentheses
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    errors.push('Unbalanced parentheses');
  }
  
  // Check for common typos
  if (code.includes('functoin')) errors.push('Typo: functoin');
  if (code.includes('var ')) errors.push('Use let/const instead of var');
  if (code.includes('==') && !code.includes('===')) {
    // Warning: prefer === over ==
  }
  
  return errors;
}
```

### 6. hybrid-preview
Превью для пользователя (diff).

**Input:** valid_patches[]  
**Output:** preview

```typescript
interface Patch {
  id: string;
  file: string;
  type: 'replace' | 'add' | 'remove';
  line: number;
  original: string;
  replacement: string;
  reason: string;
  applied: boolean;
}

export default async function run(input: { valid_patches: Patch[] }): Promise<{ preview: string }> {
  const { valid_patches } = input;
  
  if (valid_patches.length === 0) {
    return { preview: 'No patches to apply.' };
  }
  
  let preview = '# Code Fixes Preview\n\n';
  preview += `Total patches: ${valid_patches.length}\n\n`;
  
  for (const patch of valid_patches) {
    preview += `## ${patch.id}: ${patch.reason}\n`;
    preview += `- **File:** ${patch.file || 'target file'}\n`;
    preview += `- **Type:** ${patch.type}\n`;
    preview += `- **Line:** ${patch.line}\n\n`;
    
    if (patch.type === 'replace') {
      preview += '**Before:**\n';
      preview += '```typescript\n' + (patch.original || '(empty)') + '\n```\n\n';
      preview += '**After:**\n';
      preview += '```typescript\n' + patch.replacement + '\n```\n';
    } else if (patch.type === 'add') {
      preview += '**Add:**\n';
      preview += '```typescript\n' + patch.replacement + '\n```\n';
    } else if (patch.type === 'remove') {
      preview += '**Remove:**\n';
      preview += '```typescript\n' + (patch.original || '(line)') + '\n```\n';
    }
    
    preview += '---\n\n';
  }
  
  preview += '## Actions\n';
  preview += '- Confirm: Apply all fixes\n';
  preview += '- Reject: Cancel all changes\n';
  preview += '- Selective: Apply specific patches\n';
  
  return { preview };
}
```

### 7. hybrid-apply
Применение с подтверждением.

**Input:** valid_patches[], confirm?  
**Output:** applied[]

```typescript
import { readFile, writeFile } from 'fs/promises';
import * as path from 'path';

interface Patch {
  id: string;
  file: string;
  type: 'replace' | 'add' | 'remove';
  line: number;
  original: string;
  replacement: string;
  reason: string;
  applied: boolean;
}

export default async function run(input: { valid_patches: Patch[]; confirm?: boolean }): Promise<{ applied: string[]; results: ApplyResult[] }> {
  const { valid_patches, confirm = false } = input;
  
  if (!confirm) {
    return { 
      applied: [], 
      results: [{ success: false, patchId: 'all', error: 'Confirmation required' }] 
    };
  }
  
  const applied: string[] = [];
  const results: ApplyResult[] = [];
  
  // Group patches by file
  const patchesByFile = new Map<string, Patch[]>();
  for (const patch of valid_patches) {
    const file = patch.file || 'main';
    if (!patchesByFile.has(file)) {
      patchesByFile.set(file, []);
    }
    patchesByFile.get(file)!.push(patch);
  }
  
  // Apply patches per file
  for (const [file, patches] of patchesByFile) {
    try {
      // In real implementation: read file, apply patches, write back
      for (const patch of patches) {
        applied.push(patch.id);
        results.push({ 
          success: true, 
          patchId: patch.id, 
          file 
        });
      }
    } catch (e) {
      results.push({
        success: false,
        patchId: file,
        error: e instanceof Error ? e.message : 'Unknown error'
      });
    }
  }
  
  return { applied, results };
}

interface ApplyResult {
  success: boolean;
  patchId: string;
  file?: string;
  error?: string;
}
```

### 8. hybrid-rollback
Откат при ошибках.

**Input:** applied[], backup  
**Output:** rolled_back

```typescript
import { writeFile } from 'fs/promises';

interface ApplyResult {
  success: boolean;
  patchId: string;
  file?: string;
  error?: string;
}

export default async function run(input: { applied: string[]; backup: BackupData }): Promise<{ rolled_back: boolean; results: RollbackResult[] }> {
  const { applied, backup } = input;
  const results: RollbackResult[] = [];
  
  if (applied.length === 0) {
    return { rolled_back: true, results: [] };
  }
  
  let allSuccess = true;
  
  // Restore each backed up file
  for (const [filePath, content] of Object.entries(backup.files || {})) {
    try {
      await writeFile(filePath, content, 'utf-8');
      results.push({ file: filePath, success: true });
    } catch (e) {
      results.push({
        file: filePath,
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      });
      allSuccess = false;
    }
  }
  
  return { rolled_back: allSuccess, results };
}

interface BackupData {
  timestamp: number;
  files: Record<string, string>;
}

interface RollbackResult {
  file: string;
  success: boolean;
  error?: string;
}
```
