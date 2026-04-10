/**
 * Same surface as tests/monitor-tasks/promise-queue-probe (subset): pending + errors JSON.
 * Inputs: hub base (ai-integration) and optional web base (Client API proxy).
 */

export function normalizeWebOrigin(origin: string): string {
  const raw = String(origin || '').trim().replace(/\/$/, '');
  if (!raw) return raw;
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;
    const u = new URL(withScheme);
    const hn = u.hostname;
    const v6Loop =
      hn === '::1' ||
      hn === '[::1]' ||
      (hn.startsWith('[') && hn.endsWith(']') && hn.slice(1, -1) === '::1');
    if (hn === 'localhost' || v6Loop) {
      u.hostname = '127.0.0.1';
      return u.origin;
    }
  } catch {
    /* ignore */
  }
  return raw;
}

export async function fetchJson(
  url: string,
  timeoutMs: number
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const r = await fetch(url, { signal: AbortSignal.timeout(Math.max(1000, timeoutMs)) });
  const text = await r.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: r.ok, status: r.status, data };
}

export type HubProbeResult = {
  hubBase: string;
  webBase: string;
  pending: { ok: boolean; status: number; data: unknown };
  errors: { ok: boolean; status: number; data: unknown };
  clientPending?: { ok: boolean; status: number; data: unknown };
};

export async function probeHub(opts: {
  hubBase: string;
  webBase?: string;
  timeoutMs?: number;
}): Promise<HubProbeResult> {
  const hubBase = String(opts.hubBase || '').replace(/\/$/, '');
  const webBase = normalizeWebOrigin(String(opts.webBase || '').replace(/\/$/, ''));
  const ms = opts.timeoutMs ?? 20000;

  const pending = await fetchJson(`${hubBase}/promises/pending`, ms);
  const errors = await fetchJson(`${hubBase}/promises/errors`, ms);

  let clientPending: HubProbeResult['clientPending'];
  if (webBase) {
    clientPending = await fetchJson(`${webBase}/api/a2a/hub/promises/pending`, ms);
  }

  return { hubBase, webBase, pending, errors, clientPending };
}
