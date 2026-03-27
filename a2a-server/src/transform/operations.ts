/**
 * Transform Operations Implementation
 * 
 * Implements all transform operations defined in server-transform.schema.json:
 * - copy: Copy data from one JSONPath to another
 * - set: Set a value at a JSONPath
 * - append-to-array: Append a value to an array
 * - parse-json-from-md: Parse JSON from markdown file
 * - render-markdown: Render a markdown template
 * - switch: Conditional transform based on discriminator value
 * - truncate-section: Cap string length (or each string field on a plain object)
 * - merge-workbench-sections / apply-workbench-section-ops: persist LLM workbench into context
 * 
 * Pipeline usage:
 * - server-transforms-request.json: Transforms request.json to build request.md (LLM input)
 * - server-transforms-response.json: Transforms response.md to build response.json (client output)
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { 
  query, 
  set as jsonPathSet, 
  resolveTemplates 
} from './jsonpath.js';
import type { 
  TransformContext, 
  TransformStep,
  TransformFileSystem,
  CopyOperation,
  SetOperation,
  AppendToArrayOperation,
  ParseJsonFromMdOperation,
  RenderMarkdownOperation,
  SwitchOperation,
  ApplyScratchpadOpsOperation,
  ApplyWorkbenchSectionOpsOperation,
  TruncateSectionOperation,
  PickContextOperation,
  DropOperation,
  TruncateHistoryOperation,
  IncludeIfOperation,
  PickFilesOperation,
  MergeFilesToContextOperation,
  MergeWorkbenchSectionsOperation,
  SummarizeFilesOperation,
  ForEachOperation,
  ScratchpadOpCommand
} from './types.js';

/**
 * Extract JSON from markdown content
 * Looks for JSON blocks (```json ... ```) or raw JSON
 */
function extractJsonFromMarkdown(md: string): unknown {
  // Try to find JSON code block
  const jsonBlockMatch = md.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1]);
    } catch {
      // Fall through to try raw JSON
    }
  }
  
  // Try to find any code block
  const codeBlockMatch = md.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // Fall through to try raw
    }
  }
  
  // Try parsing the entire content as JSON
  try {
    return JSON.parse(md);
  } catch {
    // Return the raw content if no valid JSON found
    return md;
  }
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
    const clonedValue = JSON.parse(JSON.stringify(value));
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

function shouldSkipDuplicateUserHistoryAppend(existing: unknown[] | undefined, entry: unknown): boolean {
  if (!existing?.length || !entry || typeof entry !== 'object' || Array.isArray(entry)) {
    return false;
  }
  const e = entry as Record<string, unknown>;
  if (e.role !== 'user' || typeof e.message !== 'string') {
    return false;
  }
  const last = existing[existing.length - 1];
  if (!last || typeof last !== 'object' || Array.isArray(last)) {
    return false;
  }
  const le = last as Record<string, unknown>;
  return le.role === 'user' && le.message === e.message;
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
  const filePath = path.isAbsolute(fromFile) 
    ? fromFile 
    : path.resolve(baseDir, fromFile);
  
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
  const { templateRef, data, outputFile } = operation;
  
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
    templateData = query<Record<string, unknown>>(context.$out, data) 
      || query<Record<string, unknown>>(context.input, data)
      || (() => {
        // DEBUG: Log when fallback to empty object happens
        console.log(`[DEBUG operations.ts] JSONPath fallback to {} for data: ${data}`);
        return {};
      })();
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
  
  // Check if templateRef is a file path or a special reference
  if (templateRef.includes('#')) {
    // Handle template references like "simulations/agent-coder/3/request.md"
    const templatePath = templateRef.startsWith('/') 
      ? templateRef 
      : path.resolve(baseDir, templateRef);
    
    if (context.fs) {
      template = await context.fs.readFile(templatePath, 'utf-8');
    } else {
      template = await fs.readFile(templatePath, 'utf-8');
    }
  } else {
    // Try as file path
    const templatePath = path.resolve(baseDir, templateRef);
    if (context.fs) {
      template = await context.fs.readFile(templatePath, 'utf-8');
    } else {
      template = await fs.readFile(templatePath, 'utf-8');
    }
  }
  
  // Simple template rendering - replace placeholders
  const rendered = renderTemplateSimple(template, resolvedData);
  
  // Write output file
  const outputPath = path.resolve(baseDir, outputFile);
  
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
 * Simple template rendering - replaces {{path}} placeholders with values
 */
function renderTemplateSimple(template: string, data: Record<string, unknown>): string {
  const pattern = '\\${([^}]+)}';
  const regex = new RegExp(pattern, 'g');

  return template.replace(regex, (_, key) => {
    const trimmedKey = key.trim();
    const value = query(data, trimmedKey);
    return stringifyForTemplate(value);
  });
}

function stringifyForTemplate(value: unknown): string {
  if (value === undefined) {
    return 'null';
  }
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object' && value !== null) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function truncateToMaxChars(text: string, maxChars: number, suffix: string): string {
  if (text.length <= maxChars) return text;
  const suf = suffix;
  if (suf.length >= maxChars) return text.slice(0, maxChars);
  return text.slice(0, maxChars - suf.length) + suf;
}

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

/**
 * pick-context — keep only specified fields under context, drop the rest.
 * Supports "history:N" shorthand.
 */
async function applyPickContext(
  operation: PickContextOperation,
  context: TransformContext
): Promise<void> {
  let ctx = query<Record<string, unknown>>(context.$out, 'context');
  if (!ctx) {
    ctx = query<Record<string, unknown>>(context.input, 'context');
  }
  if (!ctx || typeof ctx !== 'object') return;

  const next: Record<string, unknown> = {};
  for (const field of operation.include) {
    const colonIdx = field.indexOf(':');
    if (colonIdx !== -1) {
      const key = field.slice(0, colonIdx);
      const spec = field.slice(colonIdx + 1).trim();
      const arr = ctx[key];
      if (Array.isArray(arr)) {
        if (spec === 'all' || spec === 'full') {
          next[key] = arr;
        } else {
          const n = parseInt(spec, 10);
          if (!Number.isFinite(n) || n <= 0) {
            next[key] = arr;
          } else {
            next[key] = arr.slice(-n);
          }
        }
      } else if (arr !== undefined) {
        next[key] = arr;
      }
    } else if (ctx[field] !== undefined) {
      next[field] = ctx[field];
    }
  }
  jsonPathSet(context.$out, 'context', next);
}

/**
 * drop — delete a JSONPath from $out.
 */
async function applyDrop(
  operation: DropOperation,
  context: TransformContext
): Promise<void> {
  const parts = operation.path.replace(/^\$\.?/, '').split('.').filter(Boolean);
  if (parts.length === 0) return;

  let obj: unknown = context.$out;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj || typeof obj !== 'object') return;
    obj = (obj as Record<string, unknown>)[parts[i]];
  }
  if (obj && typeof obj === 'object') {
    delete (obj as Record<string, unknown>)[parts[parts.length - 1]];
  }
}

/**
 * truncate-history — keep only the last N entries of context.history.
 */
async function applyTruncateHistory(
  operation: TruncateHistoryOperation,
  context: TransformContext
): Promise<void> {
  let history = query<unknown[]>(context.$out, 'context.history');
  if (!history) {
    history = query<unknown[]>(context.input, 'context.history');
  }
  if (!Array.isArray(history)) return;
  jsonPathSet(context.$out, 'context.history', history.slice(-operation.keep));
}

/**
 * include-if — drop path from $out when condition is falsy.
 */
async function applyIncludeIf(
  operation: IncludeIfOperation,
  context: TransformContext
): Promise<void> {
  let condValue = query(context.$out, operation.condition);
  if (condValue === undefined) {
    condValue = query(context.input, operation.condition);
  }
  if (!condValue) {
    await applyDrop({ op: 'drop', path: operation.path }, context);
  }
}

/**
 * pick-files — keep only specific paths in context.files.
 * "$result" auto-detects files from the result action key.
 */
async function applyPickFiles(
  operation: PickFilesOperation,
  context: TransformContext
): Promise<void> {
  let files = query<Record<string, unknown>>(context.$out, 'context.files');
  if (!files) {
    files = query<Record<string, unknown>>(context.input, 'context.files');
  }
  if (!files || typeof files !== 'object') return;

  let keepPaths: string[];
  if (operation.paths === '$result') {
    // Auto-pick: find files[] array in result action key
    const result = query<Record<string, unknown>>(context.input, 'result');
    keepPaths = [];
    if (result && typeof result === 'object') {
      for (const val of Object.values(result)) {
        if (val && typeof val === 'object' && Array.isArray((val as Record<string, unknown>).files)) {
          keepPaths.push(...((val as Record<string, unknown>).files as string[]));
        }
      }
    }
  } else {
    keepPaths = operation.paths;
  }

  const next: Record<string, unknown> = {};
  for (const p of keepPaths) {
    if (files[p] !== undefined) next[p] = files[p];
  }
  jsonPathSet(context.$out, 'context.files', next);
}

async function applyMergeWorkbenchSections(
  operation: MergeWorkbenchSectionsOperation,
  context: TransformContext
): Promise<void> {
  const { from, to } = operation;
  const incoming = query<unknown>(context.$out, from);
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return;

  const existingRaw = query<unknown>(context.$out, to);
  const base: Record<string, unknown> =
    existingRaw && typeof existingRaw === 'object' && !Array.isArray(existingRaw)
      ? JSON.parse(JSON.stringify(existingRaw))
      : {};
  const merged: Record<string, unknown> = {
    ...base,
    ...(incoming as Record<string, unknown>)
  };
  jsonPathSet(context.$out, to, merged);
}

/**
 * merge-files-to-context — fold result["read-file"] / result["write-file"] into context.files.
 */
async function applyMergeFilesToContext(
  operation: MergeFilesToContextOperation,
  context: TransformContext
): Promise<void> {
  const keys = operation.from ?? ['read-file', 'write-file'];
  const result = query<Record<string, unknown>>(context.input, 'result')
    ?? query<Record<string, unknown>>(context.$out, 'result');
  if (!result || typeof result !== 'object') return;

  let files = query<Record<string, unknown>>(context.$out, 'context.files');
  if (!files || typeof files !== 'object') files = {};
  const next = { ...files };

  for (const key of keys) {
    const val = result[key];
    if (!val || typeof val !== 'object' || Array.isArray(val)) continue;
    const v = val as Record<string, unknown>;
    const p = typeof v.path === 'string' ? v.path : null;
    const c = typeof v.content === 'string' ? v.content : null;
    if (p && c !== null) next[p] = c;
  }

  jsonPathSet(context.$out, 'context.files', next);
}

/**
 * summarize-files — truncate context.files values to first maxLines lines.
 */
async function applySummarizeFiles(
  operation: SummarizeFilesOperation,
  context: TransformContext
): Promise<void> {
  const maxLines = operation.maxLines ?? 40;
  const only = operation.only;

  let files = query<Record<string, unknown>>(context.$out, 'context.files');
  if (!files) files = query<Record<string, unknown>>(context.input, 'context.files');
  if (!files || typeof files !== 'object') return;

  const next: Record<string, unknown> = {};
  for (const [p, content] of Object.entries(files)) {
    if (only && !only.some((prefix) => p.startsWith(prefix))) {
      next[p] = content;
      continue;
    }
    if (typeof content === 'string') {
      const lines = content.split('\n');
      next[p] = lines.length > maxLines
        ? lines.slice(0, maxLines).join('\n') + `\n// ... (${lines.length - maxLines} more lines)`
        : content;
    } else {
      next[p] = content;
    }
  }
  jsonPathSet(context.$out, 'context.files', next);
}

/**
 * for-each — run sub-pipeline steps for each element of an array.
 */
async function applyForEach(
  operation: ForEachOperation,
  context: TransformContext
): Promise<void> {
  let arr = query<unknown[]>(context.$out, operation.arrayPath);
  if (!arr) arr = query<unknown[]>(context.input, operation.arrayPath);
  if (!Array.isArray(arr)) return;

  for (const item of arr) {
    // Inject $item into $out temporarily
    (context.$out as Record<string, unknown>)[operation.as] = item;
    for (const step of operation.steps) {
      await applyOperation(step, context);
    }
  }
  // Clean up injected variable
  delete (context.$out as Record<string, unknown>)[operation.as];
}

function isScratchpadCommand(x: unknown): x is ScratchpadOpCommand {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const op = o.op;
  const item = o.item;
  return (
    (op === 'check' || op === 'add' || op === 'remove') &&
    typeof item === 'string' &&
    item.length > 0
  );
}

type NormalizedWorkbenchSectionOp =
  | { kind: 'set'; key: string; value: string }
  | { kind: 'append'; key: string; text: string; sep: string }
  | { kind: 'remove'; key: string };

/** Parse LLM workbench_ops entry; supports short keys `o`,`k`,`v`,`t` and aliases `+`/`rm`/`del`. */
function normalizeWorkbenchSectionOp(raw: unknown): NormalizedWorkbenchSectionOp | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const opRaw = String(o.op ?? o.o ?? '').toLowerCase();
  const key =
    (typeof o.key === 'string' && o.key.length > 0 ? o.key : null) ??
    (typeof o.k === 'string' && o.k.length > 0 ? o.k : null);
  if (!key) return null;

  if (opRaw === 'set' || opRaw === 's') {
    const v = o.value ?? o.v;
    if (typeof v !== 'string') return null;
    return { kind: 'set', key, value: v };
  }
  if (opRaw === 'append' || opRaw === 'a' || opRaw === '+') {
    const t = o.text ?? o.t;
    if (typeof t !== 'string') return null;
    const sep = typeof o.sep === 'string' ? o.sep : '\n';
    return { kind: 'append', key, text: t, sep };
  }
  if (opRaw === 'remove' || opRaw === 'r' || opRaw === 'rm' || opRaw === 'del') {
    return { kind: 'remove', key };
  }
  return null;
}

/**
 * Merge LLM scratchpad_ops into context.scratchpad (ISSUE 6).
 */
async function applyScratchpadOps(
  operation: ApplyScratchpadOpsOperation,
  context: TransformContext
): Promise<void> {
  const { from, scratchpadPath = 'context.scratchpad' } = operation;
  let ops = query<unknown[]>(context.input, from);
  if (!ops) {
    ops = query<unknown[]>(context.$out, from);
  }
  if (!Array.isArray(ops) || ops.length === 0) {
    return;
  }

  let pad = query<Record<string, unknown>>(context.$out, scratchpadPath);
  if (!pad || typeof pad !== 'object' || Array.isArray(pad)) {
    pad = {};
  } else {
    pad = { ...pad };
  }

  for (const raw of ops) {
    if (!isScratchpadCommand(raw)) continue;
    if (raw.op === 'remove') {
      delete pad[raw.item];
    } else {
      pad[raw.item] = true;
    }
  }

  jsonPathSet(context.$out, scratchpadPath, pad);
}

/**
 * Apply LLM `workbench_ops` to `context.workbench.sections` (incremental string edits).
 */
async function applyWorkbenchSectionOps(
  operation: ApplyWorkbenchSectionOpsOperation,
  context: TransformContext
): Promise<void> {
  const { from, sectionsPath = 'context.workbench.sections' } = operation;
  let ops = query<unknown[]>(context.input, from);
  if (!ops) {
    ops = query<unknown[]>(context.$out, from);
  }
  if (!Array.isArray(ops) || ops.length === 0) {
    return;
  }

  let sections = query<Record<string, unknown>>(context.$out, sectionsPath);
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    sections = {};
  } else {
    sections = { ...sections };
  }

  for (const raw of ops) {
    const cmd = normalizeWorkbenchSectionOp(raw);
    if (!cmd) continue;
    if (cmd.kind === 'remove') {
      delete sections[cmd.key];
      continue;
    }
    if (cmd.kind === 'set') {
      sections[cmd.key] = cmd.value;
      continue;
    }
    const cur = sections[cmd.key];
    const base = typeof cur === 'string' ? cur : cur != null ? String(cur) : '';
    sections[cmd.key] = base.length > 0 ? base + cmd.sep + cmd.text : cmd.text;
  }

  jsonPathSet(context.$out, sectionsPath, sections);
}

/**
 * Switch operation - conditional transform based on discriminator value
 */
async function applySwitch(
  operation: SwitchOperation,
  context: TransformContext
): Promise<void> {
  const { discriminator, cases, default: defaultCase } = operation;
  
  // Get discriminator value
  let discValue = query(context.input, discriminator);
  if (discValue === undefined) {
    discValue = query(context.$out, discriminator);
  }
  
  // Find matching case
  const discString = String(discValue);
  let matchedCase = cases[discString];
  
  // If no exact match, try substring / '*' fallback (skip when exactOnly — e.g. form-choice routing)
  if (!matchedCase && !operation.exactOnly) {
    const caseKeys = Object.keys(cases);
    for (const key of caseKeys) {
      if (discString.includes(key) || key === '*') {
        matchedCase = cases[key];
        break;
      }
    }
  }
  
  // Apply matched case or default
  if (matchedCase) {
    // The case value is an operation object (without the 'op' field in shorthand form)
    // We need to reconstruct it
    const opValue = matchedCase.op;
    if (opValue) {
      const nestedOperation = matchedCase as TransformStep;
      await applyOperation(nestedOperation, context);
    }
  } else if (defaultCase) {
    const defaultOp = defaultCase.op;
    if (defaultOp) {
      const defaultOperation = defaultCase as TransformStep;
      await applyOperation(defaultOperation, context);
    }
  }
}

/**
 * Create a default file system implementation
 */
export function createDefaultFileSystem(): TransformFileSystem {
  return {
    async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
      return fs.readFile(filePath, encoding);
    },
    async writeFile(filePath: string, content: string): Promise<void> {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    },
    async exists(filePath: string): Promise<boolean> {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    }
  };
}
