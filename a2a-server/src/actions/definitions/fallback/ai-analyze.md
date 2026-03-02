# ai-analyze

Generic AI-based code analysis. Priority: 15. **План:
** [actions-definitions-for-auto-ai](../../../../docs/actions-definitions-for-auto-ai.md).

## Context

```json
{ "type": "analysis", "llm_required": true }
```

## Triggers

- analyze with ai
- ai analysis
- explain code
- проанализируй код
- объясни код

## Sub-actions

### 1. ai-analyze-context

Сбор контекста кода для анализа.

**Input:** target, rootDir?, options?  
**Output:** context

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface AnalyzeTarget {
  type: 'file' | 'directory' | 'pattern';
  path: string;
}

interface ContextResult {
  files: Array<{
    path: string;
    content: string;
    language: string;
    size: number;
  }>;
  summary: {
    fileCount: number;
    totalSize: number;
    languages: string[];
  };
}

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.vue': 'vue',
  '.py': 'python',
  '.php': 'php',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.c': 'c',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.sql': 'sql'
};

export default async function gatherContext(input: { 
  target: AnalyzeTarget | string;
  rootDir?: string;
  options?: {
    maxFiles?: number;
    maxFileSize?: number;
  };
}): Promise<{ context: ContextResult }> {
  const rootDir = input.rootDir || process.cwd();
  const maxFiles = input.options?.maxFiles || 20;
  const maxFileSize = input.options?.maxFileSize || 50000;
  
  const files: ContextResult['files'] = [];
  const languages = new Set<string>();
  
  // Normalize target
  let targetPath: string;
  let targetType: AnalyzeTarget['type'] = 'file';
  
  if (typeof input.target === 'string') {
    targetPath = path.join(rootDir, input.target);
    targetType = fs.statSync(targetPath).isDirectory() ? 'directory' : 'file';
  } else {
    targetPath = path.join(rootDir, input.target.path);
    targetType = input.target.type;
  }
  
  if (targetType === 'file') {
    const content = fs.readFileSync(targetPath, 'utf-8');
    const ext = path.extname(targetPath);
    const lang = EXT_TO_LANG[ext] || 'text';
    
    files.push({
      path: targetPath,
      content: content.substring(0, maxFileSize),
      language: lang,
      size: content.length
    });
    languages.add(lang);
  } else if (targetType === 'directory') {
    // Walk directory
    walkDir(targetPath, files, languages, maxFiles, maxFileSize);
  }
  
  return {
    context: {
      files,
      summary: {
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        languages: Array.from(languages)
      }
    }
  };
}

function walkDir(
  dir: string,
  files: ContextResult['files'],
  languages: Set<string>,
  maxFiles: number,
  maxFileSize: number
): void {
  if (files.length >= maxFiles) return;
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      
      const fullPath = path.join(dir, entry.name);
      
      // Skip ignored directories
      if (entry.isDirectory()) {
        const skipDirs = ['node_modules', '.git', 'dist', 'build', 'vendor', '__pycache__'];
        if (!skipDirs.includes(entry.name)) {
          walkDir(fullPath, files, languages, maxFiles, maxFileSize);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        const lang = EXT_TO_LANG[ext];
        
        if (lang) {
          try {
            const stat = fs.statSync(fullPath);
            if (stat.size <= maxFileSize) {
              const content = fs.readFileSync(fullPath, 'utf-8');
              files.push({
                path: fullPath,
                content,
                language: lang,
                size: stat.size
              });
              languages.add(lang);
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    }
  } catch (e) {
    // Skip inaccessible directories
  }
}
```

### 2. ai-analyze-llm

Запуск анализа через LLM.

**Input:** context, task, options?  
**Output:** findings[]

```typescript
interface ContextResult {
  files: Array<{
    path: string;
    content: string;
    language: string;
  }>;
  summary: {
    fileCount: number;
    languages: string[];
  };
}

interface Finding {
  type: 'issue' | 'suggestion' | 'info' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: {
    file: string;
    line?: number;
  };
  suggestion?: string;
}

interface LLMResponse {
  findings: Finding[];
  summary: string;
}

// System prompt for code analysis
const ANALYSIS_SYSTEM_PROMPT = `You are an expert code analyst. Analyze the provided code context and identify:
1. Security vulnerabilities
2. Performance issues
3. Code quality problems
4. Best practice violations
5. Potential bugs

Provide findings in a structured format with severity levels.`;

export default async function analyzeWithLLM(input: { 
  context: ContextResult;
  task: string;
  options?: {
    model?: string;
    temperature?: number;
  };
}): Promise<{ findings: Finding[]; summary: string }> {
  // Build prompt from context
  const prompt = buildAnalysisPrompt(input.context, input.task);
  
  // In production, this would call an actual LLM API
  // For now, return a mock response structure
  
  // Simulate LLM call
  const mockFindings: Finding[] = [];
  
  // Example: Analyze for common issues
  for (const file of input.context.files) {
    // Check for console.log statements
    if (file.content.includes('console.log') && file.language !== 'javascript' && file.language !== 'typescript') {
      mockFindings.push({
        type: 'issue',
        severity: 'low',
        message: 'console.log found in non-JavaScript file',
        location: { file: file.path },
        suggestion: 'Remove console.log or use appropriate logging'
      });
    }
    
    // Check for TODO comments
    const todoMatches = file.content.match(/\/\/\s*TODO|\/\*\s*TODO/i);
    if (todoMatches) {
      mockFindings.push({
        type: 'info',
        severity: 'low',
        message: 'TODO comment found',
        location: { file: file.path }
      });
    }
    
    // Check for potential security issues
    if (file.content.includes('eval(') || file.content.includes('exec(')) {
      mockFindings.push({
        type: 'security',
        severity: 'high',
        message: 'Potentially dangerous function usage detected',
        location: { file: file.path },
        suggestion: 'Avoid using eval/exec with user input'
      });
    }
  }
  
  return {
    findings: mockFindings,
    summary: `Analyzed ${input.context.summary.fileCount} files in ${input.context.summary.languages.join(', ')}. Found ${mockFindings.length} items.`
  };
}

function buildAnalysisPrompt(context: ContextResult, task: string): string {
  const filesSection = context.files
    .map(f => `// File: ${f.path}\n// Language: ${f.language}\n${f.content.substring(0, 2000)}`)
    .join('\n\n---\n\n');
  
  return `${ANALYSIS_SYSTEM_PROMPT}

Task: ${task}

Files to analyze:
${filesSection}

Provide your analysis in the following format:
- Security issues (critical/high)
- Performance problems
- Code quality issues
- Suggestions for improvement`;
}
```

### 3. ai-analyze-report

Форматирование результатов в отчёт для пользователя.

**Input:** findings[], summary, format?  
**Output:** report

```typescript
interface Finding {
  type: 'issue' | 'suggestion' | 'info' | 'security' | 'performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: {
    file: string;
    line?: number;
  };
  suggestion?: string;
}

type ReportFormat = 'markdown' | 'html' | 'json' | 'text';

const SEVERITY_ICONS = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🟢'
};

const TYPE_ICONS = {
  security: '🔒',
  performance: '⚡',
  issue: '⚠️',
  suggestion: '💡',
  info: 'ℹ️'
};

export default async function formatReport(input: { 
  findings: Finding[];
  summary: string;
  format?: ReportFormat;
}): Promise<{ report: string }> {
  const format = input.format || 'markdown';
  
  switch (format) {
    case 'markdown':
      return formatAsMarkdown(input.findings, input.summary);
    
    case 'html':
      return formatAsHtml(input.findings, input.summary);
    
    case 'json':
      return formatAsJson(input.findings, input.summary);
    
    case 'text':
      return formatAsText(input.findings, input.summary);
    
    default:
      return formatAsMarkdown(input.findings, input.summary);
  }
}

function formatAsMarkdown(findings: Finding[], summary: string): { report: string } {
  const lines: string[] = [];
  
  lines.push('# Code Analysis Report\n');
  lines.push(summary);
  lines.push('\n---\n');
  
  // Group by severity
  const severityOrder = ['critical', 'high', 'medium', 'low'];
  
  for (const severity of severityOrder) {
    const severityFindings = findings.filter(f => f.severity === severity);
    
    if (severityFindings.length === 0) continue;
    
    lines.push(`\n## ${SEVERITY_ICONS[severity]} ${severity.toUpperCase()} (${severityFindings.length})\n`);
    
    for (const finding of severityFindings) {
      lines.push(`### ${TYPE_ICONS[finding.type]} ${finding.type}`);
      lines.push(`**Message:** ${finding.message}`);
      
      if (finding.location) {
        const loc = finding.location.line 
          ? `${finding.location.file}:${finding.location.line}`
          : finding.location.file;
        lines.push(`**Location:** \`${loc}\``);
      }
      
      if (finding.suggestion) {
        lines.push(`**Suggestion:** ${finding.suggestion}`);
      }
      
      lines.push('');
    }
  }
  
  return { report: lines.join('\n') };
}

function formatAsHtml(findings: Finding[], summary: string): { report: string } {
  // Simplified HTML output
  let html = `<html><head><title>Analysis Report</title></head><body>`;
  html += `<h1>Code Analysis Report</h1>`;
  html += `<p>${summary}</p>`;
  
  for (const finding of findings) {
    const color = finding.severity === 'critical' || finding.severity === 'high' ? 'red' : 'orange';
    html += `<div style="border-left: 3px solid ${color}; padding-left: 10px; margin: 10px 0;">`;
    html += `<strong>${finding.severity.toUpperCase()}</strong>: ${finding.message}`;
    if (finding.location) {
      html += `<br><em>${finding.location.file}${finding.location.line ? ':' + finding.location.line : ''}</em>`;
    }
    html += `</div>`;
  }
  
  html += `</body></html>`;
  return { report: html };
}

function formatAsJson(findings: Finding[], summary: string): { report: string } {
  return { 
    report: JSON.stringify({ summary, findings }, null, 2) 
  };
}

function formatAsText(findings: Finding[], summary: string): { report: string } {
  const lines: string[] = [];
  
  lines.push('CODE ANALYSIS REPORT');
  lines.push('='.repeat(50));
  lines.push(summary);
  lines.push('');
  
  for (const finding of findings) {
    const icon = SEVERITY_ICONS[finding.severity];
    lines.push(`${icon} [${finding.severity.toUpperCase()}] ${finding.type}`);
    lines.push(`   ${finding.message}`);
    
    if (finding.location) {
      lines.push(`   Location: ${finding.location.file}${finding.location.line ? ':' + finding.location.line : ''}`);
    }
    
    if (finding.suggestion) {
      lines.push(`   Suggestion: ${finding.suggestion}`);
    }
    
    lines.push('');
  }
  
  return { report: lines.join('\n') };
}
```
