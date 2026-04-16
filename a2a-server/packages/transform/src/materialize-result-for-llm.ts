/**
 * Before building the LLM request prompt: fold `result` into `context.history`
 * (user line for `result.message`, system lines for tool/action payloads), then clear `result`.
 * Callers pass a clone if the original invoke payload must stay unchanged.
 */

import { A2A_TRACE_CONTEXT_KEY, deepCloneJson } from "@a2a/server-utils";
import { toInvokeShapeForPromptsTransform } from './invoke-shape.js';

const MAX_TOOL_SUMMARY = 4000;

export type HistoryEntry = { role: string; message: string };

type ToolFormatter = (o: Record<string, unknown>) => string | null;

const TOOL_FORMATTERS: Record<string, ToolFormatter> = {
  'rag-search': (o) => {
    const files = Array.isArray(o.files) ? (o.files as string[]) : [];
    const snippets = Array.isArray(o.results)
      ? (o.results as Array<{ file?: string; snippet?: string }>)
          .slice(0, 5)
          .map((r) => {
            const f = typeof r.file === 'string' ? r.file : '';
            const s = typeof r.snippet === 'string' ? r.snippet.trim().slice(0, 300) : '';
            return s ? `[${f}] ${s}` : f;
          })
          .filter(Boolean)
      : [];
    const header = `RAG (${files.length} files, page ${o.page ?? 1}, hasMore ${o.hasMore ?? false})`;
    return snippets.length > 0 ? `${header}:\n${snippets.join('\n')}` : header;
  },
  'list-directory': (o) => {
    const p = typeof o.path === 'string' ? o.path : '';
    const names = (Array.isArray(o.entries) ? o.entries as Array<{ name?: string }> : [])
      .map((e) => e.name).filter((n): n is string => typeof n === 'string').sort();
    return `Listed ${p}: ${names.join(', ')}`;
  },
  'read-file': (o) => {
    const p = typeof o.path === 'string' ? o.path : '';
    const lines = typeof o.content === 'string' ? o.content.split('\n').length : 0;
    return `Read ${p} (${lines} lines)`;
  },
  'write-file': (o) => {
    const p = typeof o.path === 'string' ? o.path : '';
    return o.success === false ? `Write failed: ${p}` : `Wrote ${p}`;
  },
  'grep-search': (o) => {
    const matches = Array.isArray(o.matches) ? o.matches : [];
    const first = matches[0] as { file?: string } | undefined;
    const file = typeof first?.file === 'string' ? first.file : '';
    // Derive scope: explicit path/glob > infer glob from matched files > pattern
    let scope: string;
    if (typeof o.path === 'string' && o.path) {
      scope = o.path;
    } else if (typeof o.glob === 'string' && o.glob) {
      scope = o.glob;
    } else if (matches.length > 0) {
      // Infer glob from common directory + extension of matched files
      const files = matches.map((m) => (m as { file?: string }).file ?? '').filter(Boolean);
      const firstFile = files[0];
      const dir = firstFile?.includes('/') ? firstFile.split('/').slice(0, -1).join('/') : '';
      const ext = firstFile?.includes('.') ? firstFile.split('.').pop() : '';
      scope = dir && ext ? `${dir}/*.${ext}` : (typeof o.pattern === 'string' ? o.pattern : 'matches');
    } else {
      scope = typeof o.pattern === 'string' ? o.pattern : 'matches';
    }
    return `Grep ${scope}: ${file || 'results'} (${matches.length} matches)`;
  },
  'execute-command': (o) => {
    const cmd = typeof o.command === 'string' ? o.command : '';
    const exit = typeof o.exitCode === 'number' ? o.exitCode : '?';
    const c = cmd.toLowerCase();
    if (c.includes('lint') && exit === 0) return 'Lint passed (exit 0)';
    if ((c.includes('test') || c === 'npm test') && exit === 0) return 'Tests passed (exit 0)';
    return `Command finished: ${cmd} (exit ${exit})`;
  },
};

/** One-line summary for a tool result key (action-key shape value). */
export function formatToolResultForHistory(actionKey: string, value: unknown): string | null {
  if (value === undefined) return null;
  if (value === null) return `${actionKey}: null`;
  if (typeof value === 'string') { const t = value.trim(); return t.length === 0 ? null : `${actionKey}: ${t}`; }
  if (typeof value === 'number' || typeof value === 'boolean') return `${actionKey}: ${String(value)}`;
  if (typeof value !== 'object' || Array.isArray(value)) return `${actionKey}: ${JSON.stringify(value)}`;

  const formatter = TOOL_FORMATTERS[actionKey];
  if (formatter) return formatter(value as Record<string, unknown>);

  let json = JSON.stringify(value);
  if (json.length > MAX_TOOL_SUMMARY) json = json.slice(0, MAX_TOOL_SUMMARY) + '…';
  return `${actionKey}: ${json}`;
}

function getHistoryTarget(root: Record<string, unknown>): {
  parent: Record<string, unknown>;
  historyKey: string;
} {
  const ctx = root['context'];
  if (ctx && typeof ctx === 'object' && !Array.isArray(ctx)) {
    return { parent: ctx as Record<string, unknown>, historyKey: 'history' };
  }
  return { parent: root, historyKey: 'history' };
}

function getHistoryArray(root: Record<string, unknown>): HistoryEntry[] {
  const { parent, historyKey } = getHistoryTarget(root);
  const h = parent[historyKey];
  if (!Array.isArray(h)) return [];
  return h.map((x) => {
    if (x && typeof x === 'object' && !Array.isArray(x)) {
      const o = x as Record<string, unknown>;
      return {
        role: typeof o.role === 'string' ? o.role : 'system',
        message: typeof o.message === 'string' ? o.message : JSON.stringify(o),
      };
    }
    return { role: 'system', message: String(x) };
  });
}

function setHistoryArray(root: Record<string, unknown>, entries: HistoryEntry[]): void {
  const { parent, historyKey } = getHistoryTarget(root);
  parent[historyKey] = entries;
}

function historyHasLine(entries: HistoryEntry[], role: string, message: string): boolean {
  return entries.some((e) => e.role === role && e.message === message);
}

/**
 * Deep-clone-safe: mutates the provided root object.
 * Folds `result` into history, sets `result` to `{}`.
 */
export function materializeResultIntoHistoryForLlm(root: Record<string, unknown>): Record<string, unknown> {
  const resultRaw = root['result'];
  const history = getHistoryArray(root);

  if (!resultRaw || typeof resultRaw !== 'object' || Array.isArray(resultRaw)) {
    root['result'] = {};
    setHistoryArray(root, history);
    return root;
  }

  const result = resultRaw as Record<string, unknown>;
  const rest: Record<string, unknown> = { ...result };
  const msg = rest['message'];
  delete rest['message'];

  if (typeof msg === 'string' && msg.trim().length > 0) {
    const trimmed = msg.trim();
    if (!historyHasLine(history, 'user', trimmed)) {
      history.push({ role: 'user', message: trimmed });
    }
  }

  const keys = Object.keys(rest).sort();
  for (const key of keys) {
    const value = rest[key];
    if (value === undefined) continue;
    const line = formatToolResultForHistory(key, value);
    if (line && !historyHasLine(history, 'system', line)) {
      history.push({ role: 'system', message: line });
    }
  }

  root['result'] = {};
  setHistoryArray(root, history);
  return root;
}

/** Remove observability-only ids so they never appear in rendered LLM prompts. */
function stripObservabilityIdsFromInvokePayloadForLlm(root: Record<string, unknown>): void {
  delete root[A2A_TRACE_CONTEXT_KEY];
  const inner = root['context'];
  if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    delete (inner as Record<string, unknown>)[A2A_TRACE_CONTEXT_KEY];
  }
}

/** Clone invoke-shaped payload, then materialize (for prompt pipeline; keeps caller's object intact). */
export function prepareInvokePayloadForLlmPrompt(input: Record<string, unknown>): Record<string, unknown> {
  const clone = deepCloneJson(input);
  stripObservabilityIdsFromInvokePayloadForLlm(clone);
  return materializeResultIntoHistoryForLlm(clone);
}

/**
 * Request transforms materialize `result.message` into `context.history` on a **clone** only.
 * Response transforms receive the live context and append assistant lines — without this sync,
 * `history` can be assistant-only. Mutates `liveInvokePayload` so `context.history` matches
 * what request transforms would have produced (user line from `result.message` / task).
 */
export function syncLiveContextHistoryFromResultMessage(liveInvokePayload: Record<string, unknown>): void {
  const shaped = toInvokeShapeForPromptsTransform(liveInvokePayload);
  const materialized = prepareInvokePayloadForLlmPrompt(deepCloneJson(shaped));
  const src = materialized['context'] as Record<string, unknown> | undefined;
  if (!src || !Array.isArray(src['history'])) {
    return;
  }
  const dst = liveInvokePayload['context'] as Record<string, unknown> | undefined;
  if (dst && typeof dst === 'object' && !Array.isArray(dst)) {
    dst['history'] = src['history'];
    return;
  }
  liveInvokePayload['history'] = src['history'];
}
