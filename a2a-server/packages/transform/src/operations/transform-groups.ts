/**
 * Transform Groups for Operations
 * 
 * Groups of related transform operations:
 * - Context operations: pick-context, drop, truncate-history
 * - File operations: pick-files, merge-files-to-context, summarize-files
 * - Workbench operations: merge-workbench-sections, merge-workbench-slots, apply-workbench-section-ops
 * - Loop operations: for-each
 * - Scratchpad operations: apply-scratchpad-ops
 * - Switch/conditional operations
 * - FileSystem factory
 */

import * as path from 'path';
import * as fs from 'node:fs/promises';
import { logger } from '@a2a/server-utils/logger.js';
import { pathIsAccessible } from '@a2a/server-utils/fs-access.js';
import { deepCloneJson } from '@a2a/server-utils/deep-clone-json.js';
import {query, set as jsonPathSet} from './json-path.js';
import type {
  TransformContext,
  TransformStep,
  TransformFileSystem,
  PickContextOperation,
  DropOperation,
  TruncateHistoryOperation,
  IncludeIfOperation,
  PickFilesOperation,
  MergeFilesToContextOperation,
  MergeWorkbenchSectionsOperation,
  MergeWorkbenchSlotsOperation,
  SummarizeFilesOperation,
  ForEachOperation,
  ApplyScratchpadOpsOperation,
  ApplyWorkbenchSectionOpsOperation,
  SwitchOperation,
  ScratchpadOpCommand
} from '../types.js';
import {SERVER_OWNED_WORKBENCH_SLOT_KEYS} from '../interrupt-trace-contract.js';

/**
 * pick-context — keep only specified fields under context, drop the rest.
 * Supports "history:N" shorthand.
 */
export async function applyPickContext(
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
export async function applyDrop(
  operation: DropOperation,
  context: TransformContext
): Promise<void> {
  const parts = operation.path.replace(/^\$\.?/, '').split('.').filter(Boolean);
  if (parts.length === 0) return;

  let obj: unknown = context.$out;
  const lastPart = parts[parts.length - 1];
  for (let i = 0; i < parts.length - 1; i++) {
    if (!obj || typeof obj !== 'object') return;
    const part = parts[i];
    if (part === undefined) return;
    obj = (obj as Record<string, unknown>)[part];
  }
  if (lastPart !== undefined && obj && typeof obj === 'object') {
    delete (obj as Record<string, unknown>)[lastPart];
  }
}

/**
 * truncate-history — keep only the last N entries of context.history.
 */
export async function applyTruncateHistory(
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
export async function applyIncludeIf(
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
export async function applyPickFiles(
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

/**
 * merge-workbench-sections — merge workbench sections into context
 */
export async function applyMergeWorkbenchSections(
  operation: MergeWorkbenchSectionsOperation,
  context: TransformContext
): Promise<void> {
  const { from, to } = operation;
  const incoming = query<unknown>(context.$out, from);
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return;

  const existingRaw = query<unknown>(context.$out, to);
  const base: Record<string, unknown> =
    existingRaw && typeof existingRaw === 'object' && !Array.isArray(existingRaw)
      ? deepCloneJson(existingRaw as Record<string, unknown>)
      : {};
  const merged: Record<string, unknown> = {
    ...base,
    ...(incoming as Record<string, unknown>)
  };
  jsonPathSet(context.$out, to, merged);
}

/**
 * merge-workbench-slots — shallow-merge LLM `workbench.slots` into context (skips server-owned keys).
 */
export async function applyMergeWorkbenchSlots(
  operation: MergeWorkbenchSlotsOperation,
  context: TransformContext
): Promise<void> {
  const {from, to = 'context.workbench.slots', skipKeys} = operation;
  const incoming = query<unknown>(context.$out, from);
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    return;
  }

  const skipSet = new Set<string>([...SERVER_OWNED_WORKBENCH_SLOT_KEYS]);
  if (skipKeys) {
    for (const k of skipKeys) skipSet.add(k);
  }

  let existingSlots = query<Record<string, unknown>>(context.$out, to);
  if (!existingSlots || typeof existingSlots !== 'object' || Array.isArray(existingSlots)) {
    existingSlots = {};
  } else {
    existingSlots = {...existingSlots};
  }

  for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
    if (skipSet.has(k)) continue;
    existingSlots[k] = v;
  }

  jsonPathSet(context.$out, to, existingSlots);
}

/**
 * merge-files-to-context — fold result["read-file"] / result["write-file"] into context.files.
 */
export async function applyMergeFilesToContext(
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
export async function applySummarizeFiles(
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
export async function applyForEach(
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
      await applyOperationFromGroups(step, context);
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
export async function applyScratchpadOps(
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
export async function applyWorkbenchSectionOps(
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
export async function applySwitch(
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
      const nestedOperation = matchedCase as unknown as TransformStep;
      await applyOperationFromGroups(nestedOperation, context);
    }
  } else if (defaultCase) {
    const defaultOp = defaultCase.op;
    if (defaultOp) {
      const defaultOperation = defaultCase as unknown as TransformStep;
      await applyOperationFromGroups(defaultOperation, context);
    }
  }
}

// Re-export applyOperation from main module for recursive calls
import { applyOperation as mainApplyOperation } from '../operations.js';
async function applyOperationFromGroups(operation: TransformStep, context: TransformContext): Promise<void> {
  // This will be resolved at runtime to avoid circular dependency
  await mainApplyOperation(operation, context);
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
      return pathIsAccessible(filePath, (m) =>
        logger.debug('[transform-fs] exists access failed', {
          filePath: m.filePath,
          code: m.code,
          error: m.error,
        })
      );
    }
  };
}