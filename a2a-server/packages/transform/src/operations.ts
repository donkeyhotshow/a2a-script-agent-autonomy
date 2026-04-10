/**
 * Transform Operations - Index File
 * 
 * Re-exports all operations from submodules:
 * - json-path.ts: JSONPath utilities
 * - value-helpers.ts: Value helper functions  
 * - transform-groups.ts: Transform groups (context, files, workbench, etc.)
 * 
 * Original single-file implementation moved to:
 * - a2a-server/src/transform/operations/json-path.ts
 * - a2a-server/src/transform/operations/value-helpers.ts
 * - a2a-server/src/transform/operations/transform-groups.ts
 */

import * as path from 'path';
import * as fs from 'node:fs/promises';
import { deepCloneJson } from '@a2a/server-utils/deep-clone-json.js';
import {
  query,
  set as jsonPathSet,
  resolveTemplates,
  extractJsonFromMarkdown,
  renderTemplateSimple
} from './operations/json-path.js';
import {
  shouldSkipDuplicateUserHistoryAppend,
  truncateToMaxChars,
} from './operations/value-helpers.js';
import type {
  TransformContext,
  TransformStep,
  CopyOperation,
  SetOperation,
  AppendToArrayOperation,
  ParseJsonFromMdOperation,
  RenderMarkdownOperation,
  TruncateSectionOperation,
} from './types.js';

import {
  applyPickContext,
  applyDrop,
  applyTruncateHistory,
  applyIncludeIf,
  applyPickFiles,
  applyMergeWorkbenchSections,
  applyMergeWorkbenchSlots,
  applyMergeFilesToContext,
  applySummarizeFiles,
  applyForEach,
  applyScratchpadOps,
  applyWorkbenchSectionOps,
  applySwitch,
} from './operations/transform-groups.js';

// Re-export from submodules
export { query, set as jsonPathSet, resolveTemplates, extractJsonFromMarkdown, renderTemplateSimple } from './operations/json-path.js';
export { shouldSkipDuplicateUserHistoryAppend } from './operations/value-helpers.js';
export { createDefaultFileSystem } from './operations/transform-groups.js';

export {
  applyPickContext,
  applyDrop,
  applyTruncateHistory,
  applyIncludeIf,
  applyPickFiles,
  applyMergeWorkbenchSections,
  applyMergeWorkbenchSlots,
  applyMergeFilesToContext,
  applySummarizeFiles,
  applyForEach,
  applyScratchpadOps,
  applyWorkbenchSectionOps,
  applySwitch,
};

const DEFAULT_RENDER_TRUNCATE_SUFFIX =
  '\n\n---\n\n*[Rendered markdown truncated by server (`maxChars` or `LLM_REQUEST_MAX_CHARS`)]*\n';

function effectiveLlmRequestMaxCharsFromEnv(): number | undefined {
  const raw = process.env.LLM_REQUEST_MAX_CHARS;
  if (raw == null || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return undefined;
  return Math.floor(n);
}

/**
 * Apply a single transform operation
 */
export async function applyOperation(
  operation: TransformStep,
  context: TransformContext
): Promise<void> {
  switch (operation.op) {
    case 'copy':
      await applyCopy(operation, context);
      break;
    case 'set':
      await applySet(operation, context);
      break;
    case 'append-to-array':
      await applyAppendToArray(operation, context);
      break;
    case 'parse-json-from-md':
      await applyParseJsonFromMd(operation, context);
      break;
    case 'render-markdown':
      await applyRenderMarkdown(operation, context);
      break;
    case 'switch':
      await applySwitch(operation, context);
      break;
    case 'apply-scratchpad-ops':
      await applyScratchpadOps(operation, context);
      break;
    case 'apply-workbench-section-ops':
      await applyWorkbenchSectionOps(operation, context);
      break;
    case 'truncate-section':
      await applyTruncateSection(operation, context);
      break;
    case 'pick-context':
      await applyPickContext(operation, context);
      break;
    case 'drop':
      await applyDrop(operation, context);
      break;
    case 'truncate-history':
      await applyTruncateHistory(operation, context);
      break;
    case 'include-if':
      await applyIncludeIf(operation, context);
      break;
    case 'pick-files':
      await applyPickFiles(operation, context);
      break;
    case 'merge-files-to-context':
      await applyMergeFilesToContext(operation, context);
      break;
    case 'merge-workbench-sections':
      await applyMergeWorkbenchSections(operation, context);
      break;
    case 'merge-workbench-slots':
      await applyMergeWorkbenchSlots(operation, context);
      break;
    case 'summarize-files':
      await applySummarizeFiles(operation, context);
      break;
    case 'for-each':
      await applyForEach(operation, context);
      break;
    default:
      throw new Error(`Unknown operation: ${(operation as TransformStep).op}`);
  }
}

/**
 * Copy operation - copies data from one JSONPath to another
 */
async function applyCopy(
  operation: CopyOperation,
  context: TransformContext
): Promise<void> {
  const { from, to } = operation;
  
  // Get value from source path
  // First check input, then $out
  let value = query(context.input, from);
  if (value === undefined) {
    value = query(context.$out, from);
  }
  
  // Set value at destination
  if (value !== undefined) {
    // Deep clone to avoid reference issues
    const clonedValue = deepCloneJson(value);
    jsonPathSet(context.$out, to, clonedValue);
  }
}

/**
 * Set operation - sets a value at a JSONPath
 */
async function applySet(
  operation: SetOperation,
  context: TransformContext
): Promise<void> {
  const { path: pathStr, value, valueFrom } = operation;
  
  let resolvedValue: unknown;
  
  if (valueFrom) {
    // Get value from JSONPath
    resolvedValue = query(context.input, valueFrom);
    if (resolvedValue === undefined) {
      resolvedValue = query(context.$out, valueFrom);
    }
  } else if (value !== undefined) {
    // Use literal value with template resolution
    // Merge input and $out for template resolution
    const mergedContext = { ...context.input, ...context.$out };
    resolvedValue = resolveTemplates(value, mergedContext);
  } else {
    resolvedValue = undefined;
  }
  
  jsonPathSet(context.$out, pathStr, resolvedValue);
}

/**
 * Append to array operation - appends a value to an array
 */
async function applyAppendToArray(
  operation: AppendToArrayOperation,
  context: TransformContext
): Promise<void> {
  const { to, value } = operation;
  
  // Resolve templates in the value
  const resolvedValue = resolveTemplates(value, context.$out);
  // Assistant line: prefer `llm.execute.message` (tool + form turns), then top-level `llm.message` (legacy / completion-only).
  if (
    resolvedValue &&
    typeof resolvedValue === 'object' &&
    !Array.isArray(resolvedValue) &&
    'message' in (resolvedValue as Record<string, unknown>)
  ) {
    const rv = resolvedValue as Record<string, unknown>;
    const cur = typeof rv.message === 'string' ? rv.message.trim() : '';
    if (!cur) {
      const llm = context.$out['llm'] as Record<string, unknown> | undefined;
      const top = typeof llm?.['message'] === 'string' ? String(llm['message']).trim() : '';
      const exec = llm?.['execute'] as Record<string, unknown> | undefined;
      const execMsg =
        exec && typeof exec['message'] === 'string' ? String(exec['message']).trim() : '';
      const line = execMsg || top;
      if (line) {
        rv.message = line;
      }
    }
  }
  if (
    resolvedValue &&
    typeof resolvedValue === 'object' &&
    !Array.isArray(resolvedValue) &&
    (resolvedValue as Record<string, unknown>).message === ''
  ) {
    return;
  }
  
  // First check if the array exists in input or $out
  let arr = query<unknown[]>(context.input, to);
  if (!arr) {
    arr = query<unknown[]>(context.$out, to);
  }
  
  if (!Array.isArray(arr)) {
    // Create a new array in $out
    jsonPathSet(context.$out, to, [resolvedValue]);
  } else {
    // Append to existing array - need to ensure it's in $out
    const outArr = query<unknown[]>(context.$out, to);
    if (outArr && Array.isArray(outArr)) {
      if (!shouldSkipDuplicateUserHistoryAppend(outArr, resolvedValue)) {
        outArr.push(resolvedValue);
      }
    } else {
      // Array exists in input but not in $out - copy it first
      if (shouldSkipDuplicateUserHistoryAppend(arr, resolvedValue)) {
        jsonPathSet(context.$out, to, [...arr]);
      } else {
        jsonPathSet(context.$out, to, [...arr, resolvedValue]);
      }
    }
  }
}

/**
 * Parse JSON from MD operation - reads markdown file and extracts JSON
 */
async function applyParseJsonFromMd(
  operation: ParseJsonFromMdOperation,
  context: TransformContext
): Promise<void> {
  const { fromFile, jsonPath = '$', to } = operation;
  
  // Resolve file path
  const baseDir = context.baseDir || process.cwd();
  const resolvedBase = path.resolve(baseDir);
  const filePath = path.isAbsolute(fromFile)
    ? fromFile
    : path.resolve(baseDir, fromFile);

  if (!filePath.startsWith(resolvedBase + path.sep) && filePath !== resolvedBase) {
    throw new Error(`Path traversal detected in fromFile: ${fromFile}`);
  }
  
  // Read file
  let content: string;
  if (context.fs) {
    content = await context.fs.readFile(filePath, 'utf-8');
  } else {
    content = await fs.readFile(filePath, 'utf-8');
  }
  
  // Extract JSON from markdown
  const jsonData = extractJsonFromMarkdown(content);
  
  // Apply JSONPath if specified
  let finalValue = jsonData;
  if (jsonPath && jsonPath !== '$') {
    finalValue = query(jsonData, jsonPath);
  }
  
  // Set in output
  jsonPathSet(context.$out, to, finalValue);
}

/**
 * Render Markdown operation - renders a markdown template with data
 */
async function applyRenderMarkdown(
  operation: RenderMarkdownOperation,
  context: TransformContext
): Promise<void> {
  const { templateRef, data, outputFile, truncateSuffix } = operation;
  
  // Get template data
  let templateData: Record<string, unknown>;
  const outStr = [String.fromCharCode(36), 'out'].join('');
  const dollar = String.fromCharCode(36);
  
  if (data === outStr) {
    templateData = context.$out;
  } else if (data === dollar || data === [dollar, 'input'].join('')) {
    templateData = context.input;
  } else if (data === [dollar, '.'].join('') || data === dollar) {
    // Handle root path - use input
    templateData = context.input;
  } else {
    // Try JSONPath
    templateData =
      query<Record<string, unknown>>(context.$out, data) ||
      query<Record<string, unknown>>(context.input, data) ||
      ({}) as Record<string, unknown>;
  }

  // Create a clean context for template resolution (without internal properties)
  const cleanContext: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context.$out)) {
    if (!key.startsWith('_')) {
      cleanContext[key] = value;
    }
  }
  
  // Resolve templates in the context for template rendering
  const resolvedData = resolveTemplates(templateData, cleanContext) as Record<string, unknown>;
  
  // Get template content
  let template: string;
  const baseDir = context.baseDir || process.cwd();
  const resolvedBase = path.resolve(baseDir);
  const containedIn = (p: string) =>
    p.startsWith(resolvedBase + path.sep) || p === resolvedBase;

  // Check if templateRef is a file path or a special reference
  if (templateRef.includes('#')) {
    // Handle template references like "simulations/agent-coder/3/request.md"
    const templatePath = templateRef.startsWith('/')
      ? templateRef
      : path.resolve(baseDir, templateRef);

    if (!containedIn(templatePath)) {
      throw new Error(`Path traversal detected in templateRef: ${templateRef}`);
    }

    if (context.fs) {
      template = await context.fs.readFile(templatePath, 'utf-8');
    } else {
      template = await fs.readFile(templatePath, 'utf-8');
    }
  } else {
    // Try as file path
    const templatePath = path.resolve(baseDir, templateRef);

    if (!containedIn(templatePath)) {
      throw new Error(`Path traversal detected in templateRef: ${templateRef}`);
    }

    if (context.fs) {
      template = await context.fs.readFile(templatePath, 'utf-8');
    } else {
      template = await fs.readFile(templatePath, 'utf-8');
    }
  }
  
  // Simple template rendering - replace placeholders
  let rendered = renderTemplateSimple(template, resolvedData);

  const envCap = outputFile === 'request.md' ? effectiveLlmRequestMaxCharsFromEnv() : undefined;
  const cap =
    operation.maxChars != null && Number.isFinite(operation.maxChars) && operation.maxChars >= 1
      ? Math.floor(operation.maxChars)
      : envCap;
  if (cap != null && rendered.length > cap) {
    const suf = truncateSuffix ?? DEFAULT_RENDER_TRUNCATE_SUFFIX;
    rendered = truncateToMaxChars(rendered, cap, suf);
  }

  // Write output file
  const outputBaseDir = context.outputDir || baseDir;
  const resolvedOutputBase = path.resolve(outputBaseDir);
  const outputPath = path.resolve(outputBaseDir, outputFile);

  if (!outputPath.startsWith(resolvedOutputBase + path.sep) && outputPath !== resolvedOutputBase) {
    throw new Error(`Path traversal detected in outputFile: ${outputFile}`);
  }

  if (context.fs) {
    await context.fs.writeFile(outputPath, rendered);
  } else {
    await fs.writeFile(outputPath, rendered, 'utf-8');
  }

  // Track written files in context
  if (!context.$out._files) {
    context.$out._files = {};
  }
  (context.$out._files as Record<string, string>)[outputFile] = rendered;
}

/**
 * Truncate section operation
 */
async function applyTruncateSection(
  operation: TruncateSectionOperation,
  context: TransformContext
): Promise<void> {
  const { path: pathStr, maxChars, suffix = '\n...[truncated]' } = operation;
  if (typeof maxChars !== 'number' || !Number.isFinite(maxChars) || maxChars < 1) {
    return;
  }

  let value = query(context.input, pathStr);
  if (value === undefined) {
    value = query(context.$out, pathStr);
  }

  if (typeof value === 'string') {
    // Use truncateToMaxChars from value-helpers
    jsonPathSet(context.$out, pathStr, truncateToMaxChars(value, maxChars, suffix));
    return;
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const src = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(src)) {
      next[k] = typeof v === 'string' ? truncateToMaxChars(v, maxChars, suffix) : v;
    }
    jsonPathSet(context.$out, pathStr, next);
  }
}
