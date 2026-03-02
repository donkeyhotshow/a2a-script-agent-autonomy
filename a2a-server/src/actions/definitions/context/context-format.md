# context-format

Форматирование контекста: упаковка для AI. **План:
** [actions-definitions-for-auto-ai](../../../../docs/actions-definitions-for-auto-ai.md) (use-case
1-context-collection).

## Priority

70

## Context

```json
{ "type": "format", "requires_serialization": true }
```

## Triggers

- context format
- format context
- serialize context
- подготовь контекст для анализа
- упакуй контекст

## Sub-actions

### 1. context-format-serialize

Сериализация контекстного блока для протокольного сообщения.

**Input:** context, format?  
**Output:** serialized

```typescript
interface ContextItem {
  filePath: string;
  content: string;
  startLine?: number;
  endLine?: number;
  language?: string;
  metadata?: Record<string, unknown>;
}

type SerializationFormat = 'json' | 'markdown' | 'text' | 'compact';

export default async function serializeContext(input: { 
  context: ContextItem[];
  format?: SerializationFormat;
}): Promise<{ serialized: string }> {
  const format = input.format || 'markdown';
  
  switch (format) {
    case 'json':
      return { serialized: JSON.stringify(input.context, null, 2) };
    
    case 'markdown':
      return serializeAsMarkdown(input.context);
    
    case 'text':
      return serializeAsText(input.context);
    
    case 'compact':
      return serializeAsCompact(input.context);
    
    default:
      return serializeAsMarkdown(input.context);
  }
}

function serializeAsMarkdown(context: ContextItem[]): { serialized: string } {
  const parts: string[] = [];
  
  for (const item of context) {
    const filename = item.filePath.split(/[/\\]/).pop();
    const lines = item.content.split('\n');
    const lineInfo = item.startLine && item.endLine 
      ? ` (lines ${item.startLine}-${item.endLine})`
      : '';
    
    parts.push(`## ${filename}${lineInfo}`);
    parts.push('```' + (item.language || ''));
    parts.push(item.content);
    parts.push('```');
    parts.push('');
  }
  
  return { serialized: parts.join('\n') };
}

function serializeAsText(context: ContextItem[]): { serialized: string } {
  const parts: string[] = [];
  
  for (const item of context) {
    const lineInfo = item.startLine && item.endLine 
      ? `[${item.startLine}-${item.endLine}]`
      : '';
    
    parts.push(`=== ${item.filePath} ${lineInfo} ===`);
    parts.push(item.content);
    parts.push('');
  }
  
  return { serialized: parts.join('\n') };
}

function serializeAsCompact(context: ContextItem[]): { serialized: string } {
  const items = context.map(item => ({
    path: item.filePath,
    lines: item.startLine && item.endLine 
      ? `${item.startLine}-${item.endLine}` 
      : undefined,
    content: item.content.substring(0, 500) // Truncate for compactness
  }));
  
  return { serialized: JSON.stringify(items) };
}
```

### 2. context-format-pack

Упаковка контекста для внешнего AI (структура для Claude/GPT).

**Input:** serialized, maxTokens?, includeMetadata?  
**Output:** packed

```typescript
interface PackedContext {
  snippets: Array<{
    filename: string;
    path: string;
    language: string;
    content: string;
    relevanceScore?: number;
  }>;
  fileList: string[];
  graphHints?: {
    structure: string;
    dependencies: string[];
  };
  tokenCount: number;
}

const TOKEN_ESTIMATE = 4; // chars per token approximately

export default async function packContext(input: { 
  serialized: string;
  maxTokens?: number;
  includeMetadata?: boolean;
}): Promise<{ packed: PackedContext }> {
  const maxTokens = input.maxTokens || 8000;
  const maxChars = maxTokens * TOKEN_ESTIMATE;
  
  // Parse the serialized content to extract snippets
  const snippets: PackedContext['snippets'] = [];
  const fileList: string[] = [];
  
  // Simple parsing - in production would use proper parser
  const content = input.serialized;
  
  // Extract file sections
  const fileRegex = /##\s+([^\n]+)(?:\s+\(lines\s+(\d+)-(\d+)\))?/g;
  let match;
  let lastIndex = 0;
  
  while ((match = fileRegex.exec(content)) !== null) {
    const filename = match[1];
    const startLine = match[2] ? parseInt(match[2]) : undefined;
    const endLine = match[3] ? parseInt(match[3]) : undefined;
    
    // Find the code block content after this header
    const headerEnd = match.index + match[0].length;
    const nextHeader = content.indexOf('\n## ', headerEnd);
    const codeBlockStart = content.indexOf('```', headerEnd);
    const codeBlockEnd = content.indexOf('```', codeBlockStart + 3);
    
    let codeContent = '';
    if (codeBlockStart !== -1 && (nextHeader === -1 || codeBlockStart < nextHeader)) {
      codeContent = content.substring(codeBlockStart + 3, codeBlockEnd).trim();
    }
    
    const pathMatch = content.substring(0, match.index).split('\n').reverse()
      .find(line => line.startsWith('`/') || line.startsWith('`C:'));
    
    const path = pathMatch ? pathMatch.replace(/`/g, '') : filename;
    
    snippets.push({
      filename,
      path,
      language: detectLanguage(filename),
      content: codeContent
    });
    
    fileList.push(path);
    
    lastIndex = nextHeader === -1 ? content.length : nextHeader;
  }
  
  // If no snippets extracted, try a simpler approach
  if (snippets.length === 0) {
    snippets.push({
      filename: 'context',
      path: 'context',
      language: 'text',
      content: content.substring(0, maxChars)
    });
  }
  
  // Truncate content if needed
  let currentTokens = estimateTokens(JSON.stringify(snippets));
  
  if (currentTokens > maxTokens) {
    // Truncate each snippet proportionally
    const ratio = maxTokens / currentTokens;
    for (const snippet of snippets) {
      snippet.content = snippet.content.substring(0, Math.floor(snippet.content.length * ratio));
    }
  }
  
  const packed: PackedContext = {
    snippets,
    fileList,
    tokenCount: estimateTokens(JSON.stringify(snippets))
  };
  
  return { packed };
}

function detectLanguage(filename: string): string {
  const ext = filename.match(/\.([^.]+)$/)?.[1] || '';
  
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    vue: 'vue',
    svelte: 'svelte',
    py: 'python',
    php: 'php',
    java: 'java',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    htm: 'html',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    graphql: 'graphql',
    gql: 'graphql'
  };
  
  return langMap[ext] || 'text';
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / TOKEN_ESTIMATE);
}
```

### 3. context-format-validate

Валидация упакованного контекста перед отправкой.

**Input:** packed  
**Output:** valid, warnings

```typescript
interface PackedContext {
  snippets: Array<{
    filename: string;
    path: string;
    language: string;
    content: string;
  }>;
  fileList: string[];
  tokenCount: number;
}

export default async function validatePackedContext(input: { 
  packed: PackedContext;
}): Promise<{ 
  valid: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];
  
  // Check for empty snippets
  const emptySnippets = input.packed.snippets.filter(s => !s.content.trim());
  if (emptySnippets.length > 0) {
    warnings.push(`${emptySnippets.length} snippet(s) are empty`);
  }
  
  // Check for very large snippets
  const largeSnippets = input.packed.snippets.filter(s => s.content.length > 10000);
  if (largeSnippets.length > 0) {
    warnings.push(`${largeSnippets.length} snippet(s) are very large (>10KB)`);
  }
  
  // Check token count
  if (input.packed.tokenCount > 10000) {
    warnings.push(`Token count (${input.packed.tokenCount}) exceeds typical limits`);
  }
  
  // Check for duplicate files
  const uniquePaths = new Set(input.packed.fileList);
  if (uniquePaths.size < input.packed.fileList.length) {
    warnings.push('Duplicate files detected in context');
  }
  
  // Check for missing languages
  const noLang = input.packed.snippets.filter(s => !s.language || s.language === 'text');
  if (noLang.length > 0) {
    warnings.push(`${noLang.length} snippet(s) have no language detected`);
  }
  
  const valid = warnings.length === 0;
  
  return { valid, warnings };
}
```
