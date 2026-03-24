/**
 * Before building the LLM request prompt: fold `result` into `context.history`
 * (user line for `result.message`, system lines for tool/action payloads), then clear `result`.
 * Callers pass a clone if the original invoke payload must stay unchanged.
 */

const MAX_TOOL_SUMMARY = 4000;

export type HistoryEntry = { role: string; message: string };

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
      const role = typeof o.role === 'string' ? o.role : 'system';
      const message = typeof o.message === 'string' ? o.message : JSON.stringify(o);
      return { role, message };
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

/** One-line summary for a tool result key (action-key shape value). */
export function formatToolResultForHistory(actionKey: string, value: unknown): string | null {
  if (value === undefined) return null;
  if (value === null) return `${actionKey}: null`;

  if (typeof value === 'string') {
    const t = value.trim();
    return t.length === 0 ? null : `${actionKey}: ${t}`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${actionKey}: ${String(value)}`;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return `${actionKey}: ${JSON.stringify(value)}`;
  }

  const o = value as Record<string, unknown>;

  switch (actionKey) {
    case 'rag-search': {
      const files = Array.isArray(o.files) ? (o.files as string[]) : [];
      const snippets = Array.isArray(o.results)
        ? (o.results as Array<{ file?: string; snippet?: string; score?: number }>)
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
    }
    case 'list-directory': {
      const p = typeof o.path === 'string' ? o.path : '';
      const entries = Array.isArray(o.entries)
        ? (o.entries as Array<{ name?: string; type?: string }>)
        : [];
      const names = entries
        .map((e) => e.name)
        .filter((n): n is string => typeof n === 'string')
        .sort();
      const summary = names.join(', ');
      return `Listed ${p}: ${summary}`;
    }
    case 'read-file': {
      const pathStr = typeof o.path === 'string' ? o.path : '';
      const content = typeof o.content === 'string' ? o.content : '';
      const lines = content.length > 0 ? content.split('\n').length : 0;
      return `Read ${pathStr} (${lines} lines)`;
    }
    case 'write-file': {
      const pathStr = typeof o.path === 'string' ? o.path : '';
      if (o.success === false) return `Write failed: ${pathStr}`;
      return `Wrote ${pathStr}`;
    }
    case 'grep-search': {
      let pathStr = typeof o.path === 'string' ? o.path : '';
      let glob = typeof o.glob === 'string' ? o.glob : '';
      const matches = Array.isArray(o.matches) ? o.matches : [];
      const first = matches[0] as { file?: string } | undefined;
      const file = typeof first?.file === 'string' ? first.file : '';
      if ((!pathStr || !glob) && file) {
        const slash = file.lastIndexOf('/');
        if (slash >= 0) {
          pathStr = pathStr || file.slice(0, slash);
          const base = file.slice(slash + 1);
          if (!glob && /\.test\.[jt]s$/i.test(base)) glob = '*.test.js';
          else if (!glob && base) glob = base.replace(/^[^.]+/, '*');
        }
      }
      const scope =
        pathStr && glob ? `${pathStr}/${glob}` : pathStr || glob || (typeof o.pattern === 'string' ? o.pattern : '') || 'matches';
      return `Grep ${scope}: ${file || 'results'} (${matches.length} matches)`;
    }
    case 'execute-command': {
      const cmd = typeof o.command === 'string' ? o.command : '';
      const code = o.exitCode;
      const exit = typeof code === 'number' ? code : '?';
      const c = cmd.toLowerCase();
      if (c.includes('lint') && exit === 0) return 'Lint passed (exit 0)';
      if ((c.includes('test') || c === 'npm test') && exit === 0) return 'Tests passed (exit 0)';
      return `Command finished: ${cmd} (exit ${exit})`;
    }
    default:
      break;
  }

  let json = JSON.stringify(o);
  if (json.length > MAX_TOOL_SUMMARY) {
    json = json.slice(0, MAX_TOOL_SUMMARY) + '…';
  }
  return `${actionKey}: ${json}`;
}

/**
 * Deep-clone-safe: mutates the provided root object.
 * Folds `result` into history, sets `result` to `{}`.
 */
export function materializeResultIntoHistoryForLlm(root: Record<string, unknown>): Record<string, unknown> {
  const resultRaw = root['result'];
  let history = getHistoryArray(root);

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

/** Clone invoke-shaped payload, then materialize (for prompt pipeline; keeps caller's object intact). */
export function prepareInvokePayloadForLlmPrompt(input: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(input)) as Record<string, unknown>;
  return materializeResultIntoHistoryForLlm(clone);
}
