import { llmService } from './llm-service.js';
import { logger } from '../../utils/logger.js';
import { tryParseJsonFromLlmText } from '../../utils/strip-markdown-json-fence.js';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

export interface BugFixPatch {
  file: string;
  original: string;
  replacement: string;
}

export interface BugFixContext {
  failedCode: string;
  error: string;
  fileContent?: string;
  imports?: string[];
  gitDiff?: string;
  surroundingCode?: string;
}

export interface BugFixResult {
  fixed: boolean;
  patches: BugFixPatch[];
  analysis: string;
  cascadeRisk?: string[];
}

/**
 * Parse JSON from LLM response with fallback
 */
function parseBugFixResult(content: string): BugFixResult {
  const parsed = tryParseJsonFromLlmText(content);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as BugFixResult;
  }
  if (content.trim().length > 0) {
    logger.debug('[BugFixer] Fix-result JSON parse failed', {
      preview: content.slice(0, 120),
    });
  }
  return { fixed: false, patches: [], analysis: 'Failed to parse fix result' };
}

/**
 * Extract file path from code snippet or error trace
 */
function extractFilePath(code: string, error: string): string | null {
  // Try to extract from error stack trace
  const fileMatch = error.match(/at .+\s+\(([^:]+):\d+:\d+\)/) || 
                    error.match(/([^/\s]+\.(ts|js|tsx|jsx)):/) ||
                    code.match(/file:\s*["']([^"']+)["']/);
  return fileMatch ? fileMatch[1] : null;
}

/**
 * Get git diff for a file
 */
async function getGitDiff(filePath: string): Promise<string> {
  try {
    const r = spawnSync('git', ['diff', '--no-color', '--', filePath], {
      encoding: 'utf-8',
      timeout: 5000,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (r.error) {
      logger.debug('[BugFixer] git diff unavailable', {
        filePath,
        error: r.error.message,
      });
      return '';
    }
    return typeof r.stdout === 'string' ? r.stdout : '';
  } catch (err: unknown) {
    logger.debug('[BugFixer] git diff unavailable', {
      filePath,
      error: err instanceof Error ? err.message : String(err),
    });
    return '';
  }
}

/**
 * Get surrounding context for a file (imports + related code)
 */
async function getSurroundingContext(filePath: string): Promise<{imports: string[], context: string}> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Get top 30 lines (imports + declarations)
    const topLines = lines.slice(0, 30);
    const imports = topLines
      .filter(l => l.match(/^(import|export|from|require)/))
      .slice(0, 10);
    
    // Get context around key areas
    const context = lines.slice(0, 50).join('\n');
    
    return { imports, context };
  } catch (err: unknown) {
    logger.debug('[BugFixer] Could not read surrounding context', {
      filePath,
      error: err instanceof Error ? err.message : String(err),
    });
    return { imports: [], context: '' };
  }
}

export class BugFixer {
  /**
   * Analyze failure and produce patches with full context
   */
  async fix(failedCode: string, error: string): Promise<BugFixResult> {
    logger.info('[BugFixer] Analyzing failure with full context...', { 
      error: error.slice(0, 100) 
    });

    // Extract file path and get surrounding context
    const filePath = extractFilePath(failedCode, error);
    let fileContent = '';
    let imports: string[] = [];
    let gitDiff = '';
    let surroundingCode = '';

    if (filePath) {
      try {
        fileContent = await readFile(filePath, 'utf-8');
        const context = await getSurroundingContext(filePath);
        imports = context.imports;
        surroundingCode = context.context;
      } catch (e) {
        logger.warn('[BugFixer] Could not read file', { filePath, error: String(e) });
      }

      try {
        gitDiff = await getGitDiff(filePath);
      } catch (err: unknown) {
        logger.debug('[BugFixer] getGitDiff threw', {
          filePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Build comprehensive context prompt
    const contextPrompt = `You are an advanced bug fixer. Analyze the code, error, and surrounding context to identify the root cause.

## Error
${error}

## Failed Code Snippet
\`\`\`${failedCode}
\`\`\`
${filePath ? `## Target File: ${filePath}` : ''}
${gitDiff ? `## Git Diff\n\`\`\`\n${gitDiff}\n\`\`\`` : ''}
${imports.length > 0 ? `## Imports\n\`\`\`\n${imports.join('\n')}\n\`\`\`` : ''}
${surroundingCode ? `## File Context\n\`\`\`\n${surroundingCode}\n\`\`\`` : ''}

Provide a fix that considers:
1. The actual error type and message
2. Imports and dependencies
3. Recent changes in git diff
4. Surrounding code patterns

Output JSON ONLY:
{
  "fixed": boolean,
  "patches": [{ "file": "...", "original": "...", "replacement": "..." }],
  "analysis": "...",
  "cascadeRisk": ["file1", "file2"]  // Files that might be affected
}`;

    const response = await llmService.chat({
      messages: [
        { role: 'system', content: 'You are an advanced bug fixer. Always consider cascade risk and verify patches.' },
        { role: 'user', content: contextPrompt }
      ]
    });

    const result = parseBugFixResult(response.content || '');
    
    logger.info('[BugFixer] Analysis complete', { 
      fixed: result.fixed,
      patchCount: result.patches.length,
      cascadeRisk: result.cascadeRisk?.length 
    });

    return result;
  }

  /**
   * Verify patches by checking for cascade effects
   */
  async verifyPatches(patches: BugFixPatch[]): Promise<{valid: boolean, conflicts: string[]}> {
    if (!patches.length) {
      return { valid: true, conflicts: [] };
    }

    logger.info('[BugFixer] Verifying patches for cascade effects', { count: patches.length });
    
    const affectedFiles = patches.map(p => p.file);
    const conflicts: string[] = [];

    // Check each patched file for imports that might be affected
    for (const filePath of affectedFiles) {
      try {
        const content = await readFile(filePath, 'utf-8');
        // Find all imports in file
        const fileImports = content.match(/import\s+.*\s+from\s+["']([^"'])["']/g) || [];
        
        for (const imp of fileImports) {
          // Check if any other patched file matches this import
          const impPath = imp.match(/["']([^"']+)["']/)?.[1];
          if (impPath && !affectedFiles.includes(impPath) && !conflicts.includes(impPath)) {
            conflicts.push(impPath);
          }
        }
      } catch (err: unknown) {
        logger.debug('[BugFixer] Cascade check file read failed', {
          filePath,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (conflicts.length > 0) {
      logger.warn('[BugFixer] Potential cascade conflicts detected', { conflicts });
    }

    return { valid: conflicts.length === 0, conflicts };
  }
}

export const bugFixer = new BugFixer();
