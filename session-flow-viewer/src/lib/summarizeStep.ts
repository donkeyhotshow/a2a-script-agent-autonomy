import type { StepArtifacts } from './types';

/** Prefer stable router/tool ordering; object key order alone is not reliable across writers. */
const EXECUTE_KEY_PRIORITY = ['message', 'form', 'script', 'error'] as const;

function pickExecuteKey(ex: unknown): string {
  if (!ex || typeof ex !== 'object') return '—';
  const o = ex as Record<string, unknown>;
  const keys = Object.keys(o);
  if (!keys.length) return 'empty';
  for (const p of EXECUTE_KEY_PRIORITY) {
    if (Object.prototype.hasOwnProperty.call(o, p)) return p;
  }
  const fileAction = keys.find(
    (k) => k.startsWith('read-') || k.startsWith('write-') || k === 'list-directory'
  );
  if (fileAction) return fileAction;
  return keys.sort()[0] ?? 'empty';
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

/** One-line summary for node label */
export function summarizeStepTitle(step: StepArtifacts): string {
  const sr = step.serverResponse;
  if (!sr || typeof sr !== 'object') {
    if (step.clientResult) return 'client only';
    return 'no server response';
  }
  const ex = (sr as { execute?: unknown }).execute;
  if (ex && typeof ex === 'object') {
    const key = pickExecuteKey(ex);
    if (key === 'message' && typeof (ex as { message?: unknown }).message === 'string') {
      return truncate(String((ex as { message: string }).message), 72);
    }
    if (key === 'form') {
      const form = (ex as { form?: { title?: string; choices?: unknown[] } }).form;
      const title = form?.title;
      const ch = form?.choices;
      const nCh = Array.isArray(ch) ? ch.length : 0;
      const suffix = nCh > 0 ? ` (${nCh} choices)` : '';
      if (title) return `form: ${truncate(title, 48)}${suffix}`;
      return nCh > 0 ? `form (router, ${nCh} choices)` : 'form (router)';
    }
    if (key === 'script' || key.startsWith('read-') || key.startsWith('write-')) {
      return key;
    }
    return `execute.${key}`;
  }
  const res = (sr as { result?: unknown }).result;
  if (res && typeof res === 'object' && !Array.isArray(res)) {
    const rk = pickExecuteKey(res);
    if (rk !== '—' && rk !== 'empty') return `result.${rk}`;
  }
  const ctx = (sr as { context?: { step?: string } }).context;
  if (ctx?.step) return `context: ${truncate(String(ctx.step), 48)}`;
  return 'server response';
}

export function detailText(step: StepArtifacts): string {
  const parts: string[] = [];
  parts.push(`Step ${step.step}`);
  if (step.serverResponse) {
    try {
      parts.push('--- server-response.json ---');
      parts.push(JSON.stringify(step.serverResponse, null, 2));
    } catch {
      parts.push('[server response not serializable]');
    }
  } else {
    parts.push('(no server-response.json)');
  }
  if (step.clientResult) {
    parts.push('--- client-result.json ---');
    parts.push(JSON.stringify(step.clientResult, null, 2));
  }
  if (step.requestToServer) {
    parts.push('--- request-to-server.json ---');
    parts.push(JSON.stringify(step.requestToServer, null, 2));
  }
  if (step.serverPromise) {
    parts.push('--- server-promise.json ---');
    parts.push(JSON.stringify(step.serverPromise, null, 2));
  }
  if (step.messages != null) {
    parts.push('--- messages.json ---');
    parts.push(
      typeof step.messages === 'string'
        ? step.messages
        : JSON.stringify(step.messages, null, 2)
    );
  }
  return parts.join('\n');
}
