/**
 * Shared hub promise-queue probes (pending + errors with previews).
 * Used by `check-promise-queue.mjs` CLI and Task Monitor diagnostics.
 */

/**
 * Node may resolve `localhost` to ::1 while Vite dev often listens on IPv4 only → wrong socket or spurious 404.
 * Use 127.0.0.1 for Client API hub proxy probes only (hub direct `AI_HUB_URL` unchanged).
 */
export function normalizeClientHubProbeOrigin(origin) {
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

export function rowId(row) {
  if (row && typeof row === 'object' && row.promiseId != null) return row.promiseId;
  if (row && typeof row === 'object' && row.id != null) return row.id;
  return row;
}

export function errorPreview(row, maxLen = 400) {
  if (!row || typeof row !== 'object') return '';
  const e = row.error;
  if (typeof e !== 'string' || !e.trim()) return '';
  const t = e.trim();
  const n = Math.max(40, maxLen);
  if (t.length <= n) return t;
  return `${t.slice(0, n - 3)}...`;
}

/** One-line operator hint for a pending row (hub list). */
export function formatPendingRowLine(row, index) {
  const id = rowId(row);
  const created = row?.created_at || row?.created_at_unix || '';
  const folder = typeof row?.log_folder === 'string' ? row.log_folder : '';
  const folderShort = folder.length > 72 ? `${folder.slice(0, 69)}...` : folder;
  const pathBit = row?.path || row?.method || '';
  const bits = [`${index + 1}. ${id}`];
  if (created) bits.push(`created=${created}`);
  if (pathBit) bits.push(String(pathBit).slice(0, 80));
  if (folderShort) bits.push(`log=${folderShort}`);
  return `  ${bits.join(' | ')}`;
}

/** One-line operator hint for an error row (hub list). */
export function formatErrorRowLine(row, index) {
  const id = rowId(row);
  const updated = row?.updated_at || row?.updated_at_unix || '';
  const pathBit = row?.path || row?.method || '';
  const err = errorPreview(row, row?.error_truncated ? 400 : 2000);
  const trunc = row?.error_truncated ? ' [truncated in list; use --detail or ?detail=1]' : '';
  const bits = [`${index + 1}. ${id}`];
  if (updated) bits.push(`updated=${updated}`);
  if (pathBit) bits.push(String(pathBit).slice(0, 80));
  if (err) bits.push(`err=${err}${trunc}`);
  return `  ${bits.join(' | ')}`;
}

async function fetchJson(url, timeoutMs) {
  const r = await fetch(url, { signal: AbortSignal.timeout(Math.max(1000, timeoutMs)) });
  const text = await r.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      /* leave null */
    }
  }
  return { ok: r.ok, status: r.status, text, data };
}

/**
 * @param {{
 *   hubBase: string,
 *   webBase?: string,
 *   timeoutMs?: number,
 *   checkHealth?: boolean,
 *   checkErrors?: boolean,
 *   previewLimit?: number,
 *   clientPreviewLimit?: number,
 *   pendingNonOkIsError?: boolean,
 *   errorsDetail?: boolean,
 *   richLogLines?: boolean,
 * }} opts
 */
export async function probePromiseQueues(opts) {
  const base = String(opts.hubBase || '').replace(/\/$/, '');
  const webBase = String(opts.webBase || '').replace(/\/$/, '');
  const ms = Math.max(1000, opts.timeoutMs ?? 20000);
  const checkHealth = opts.checkHealth !== false;
  const checkErrors = opts.checkErrors !== false;
  const previewLimit = opts.previewLimit ?? parseInt(process.env.PROMISES_PREVIEW_ROWS || '12', 10);
  const clientPreview = opts.clientPreviewLimit ?? 8;
  const pendingFatal = opts.pendingNonOkIsError === true;
  const errorsDetail =
    opts.errorsDetail === true ||
    /^(1|true|yes)$/i.test(String(process.env.PROMISES_ERRORS_DETAIL || '').trim()) ||
    /^(1|true|yes)$/i.test(String(process.env.TASK_MONITOR_ERRORS_DETAIL || '').trim());
  const richLog =
    opts.richLogLines !== false &&
    !/^(1|true|yes)$/i.test(String(process.env.PROMISES_COMPACT_LOG || '').trim());

  /** @type {{ level: 'log'|'warn'|'error', text: string }[]} */
  const log = [];

  const out = {
    healthOk: null,
    pending: { count: -1, rows: [], url: '' },
    errors: { count: -1, rows: [], url: '' },
    clientPending: -1,
    clientErrors: -1,
    log,
  };

  if (checkHealth) {
    const url = `${base}/health`;
    const res = await fetchJson(url, ms);
    if (!res.ok) {
      out.healthOk = false;
      log.push({
        level: 'error',
        text: `[health] ${res.status} ${url}\n${(res.text || '').slice(0, 400)}`,
      });
      if (pendingFatal) throw new Error(`Hub health failed: ${res.status}`);
    } else {
      out.healthOk = true;
      const d = res.data && typeof res.data === 'object' ? res.data : {};
      const up = d.local_llm_upstream_available;
      log.push({
        level: 'log',
        text: `[health] ${url} -> ${res.status} status=${JSON.stringify(d.status)} upstream=${JSON.stringify(up)}`,
      });
    }
  }

  const pendingUrl = `${base}/promises/pending`;
  out.pending.url = pendingUrl;
  const pr = await fetchJson(pendingUrl, ms);
  if (!pr.ok) {
    out.pending.count = -1;
    log.push({
      level: pendingFatal ? 'error' : 'warn',
      text: `${pr.status} ${pendingUrl}\n${(pr.text || '').slice(0, 500)}`,
    });
    if (pendingFatal) throw new Error(`GET pending failed: ${pr.status}`);
  } else {
    const rows = Array.isArray(pr.data) ? pr.data : [];
    out.pending.count = rows.length;
    out.pending.rows = rows;
    log.push({ level: 'log', text: `${pendingUrl} -> ${rows.length} pending` });
    rows.slice(0, previewLimit).forEach((row, i) => {
      log.push({
        level: 'log',
        text: richLog ? formatPendingRowLine(row, i) : `  ${i + 1}. ${rowId(row)}`,
      });
    });
    if (rows.length > previewLimit) {
      log.push({ level: 'log', text: `  ... +${rows.length - previewLimit} more` });
    }
  }

  if (checkErrors) {
    const errUrl = `${base}/promises/errors${errorsDetail ? '?detail=1' : ''}`;
    out.errors.url = errUrl;
    const er = await fetchJson(errUrl, ms);
    if (!er.ok) {
      out.errors.count = -1;
      log.push({
        level: pendingFatal ? 'error' : 'warn',
        text: `${er.status} ${errUrl}\n${(er.text || '').slice(0, 500)}`,
      });
      if (pendingFatal) throw new Error(`GET errors failed: ${er.status}`);
    } else {
      const rows = Array.isArray(er.data) ? er.data : [];
      out.errors.count = rows.length;
      out.errors.rows = rows;
      log.push({
        level: 'log',
        text: `${errUrl} -> ${rows.length} error${errorsDetail ? ' (detail=1 full text)' : ''}`,
      });
      rows.slice(0, previewLimit).forEach((row, i) => {
        if (richLog) {
          log.push({ level: 'log', text: formatErrorRowLine(row, i) });
        } else {
          const ep = errorPreview(row);
          log.push({
            level: 'log',
            text: `  ${i + 1}. ${rowId(row)}${ep ? ` | ${ep}` : ''}`,
          });
        }
      });
      if (rows.length > previewLimit) {
        log.push({ level: 'log', text: `  ... +${rows.length - previewLimit} more` });
      }
    }
  }

  const clientOrigin = webBase ? normalizeClientHubProbeOrigin(webBase) : '';
  if (clientOrigin) {
    const probeClient = async (suffix, kind, query = '') => {
      const url = `${clientOrigin}/api/a2a/hub${suffix}${query}`;
      try {
        const r = await fetch(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(ms),
        });
        const text = await r.text();
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (r.ok && !ct.includes('json')) {
          log.push({
            level: 'warn',
            text: `[hub proxy] ${url} -> ${r.status} non-JSON (${ct.slice(0, 60)}); expected Client API JSON`,
          });
          return -1;
        }
        if (r.ok) {
          let data;
          try {
            data = JSON.parse(text);
          } catch {
            log.push({
              level: 'warn',
              text: `[hub proxy] ${url} -> not JSON: ${text.slice(0, 120)}`,
            });
            return -1;
          }
          const rows = Array.isArray(data) ? data : [];
          const n = rows.length;
          log.push({
            level: 'log',
            text: `[hub proxy] ${url} -> ${r.status} ${n} ${kind}`,
          });
          rows.slice(0, clientPreview).forEach((row, i) => {
            const line =
              richLog && kind === 'pending'
                ? formatPendingRowLine(row, i)
                : richLog && kind === 'errors'
                  ? formatErrorRowLine(row, i)
                  : `  ${i + 1}. ${rowId(row)}${kind === 'errors' && errorPreview(row) ? ` | ${errorPreview(row)}` : ''}`;
            log.push({ level: 'log', text: line });
          });
          return n;
        }
        if (r.status === 502) {
          log.push({
            level: 'warn',
            text: `[hub proxy] ${url} -> 502 (hub unreachable from Client API; route may still exist)`,
          });
        } else {
          log.push({
            level: 'warn',
            text: `[hub proxy] ${url} -> ${r.status} ${text.slice(0, 200)}`,
          });
        }
      } catch (e) {
        log.push({
          level: 'warn',
          text: `[hub proxy] ${url} -> ${e?.message || e} (is Vite on ${webBase}?)`,
        });
      }
      return -1;
    };

    if (checkErrors) {
      out.clientErrors = await probeClient(
        '/promises/errors',
        'errors',
        errorsDetail ? '?detail=1' : ''
      );
    }
    out.clientPending = await probeClient('/promises/pending', 'pending', '');
  }

  return out;
}

/**
 * Compact object for `--json` / dashboards (trim row payloads).
 * @param {Awaited<ReturnType<typeof probePromiseQueues>>} result
 * @param {{ maxRows?: number }} [opt]
 */
export function probeToJsonReport(result, opt = {}) {
  const maxRows = opt.maxRows ?? parseInt(process.env.PROMISES_JSON_MAX_ROWS || '40', 10);
  const pick = (rows) =>
    (Array.isArray(rows) ? rows : []).slice(0, maxRows).map((row) => {
      if (!row || typeof row !== 'object') return row;
      return {
        promiseId: row.promiseId ?? row.id,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        method: row.method,
        path: row.path,
        target_url: row.target_url,
        log_folder: row.log_folder,
        error: row.error,
        error_truncated: row.error_truncated,
      };
    });
  return {
    scannedAt: new Date().toISOString(),
    healthOk: result.healthOk,
    hub: {
      pending: { count: result.pending.count, url: result.pending.url, rows: pick(result.pending.rows) },
      errors: { count: result.errors.count, url: result.errors.url, rows: pick(result.errors.rows) },
    },
    client: {
      pending: result.clientPending,
      errors: result.clientErrors,
    },
  };
}

/** Emit probe log lines via console or monitor `this.log`. */
export function emitProbeLogLines(result, writeLog) {
  const fn =
    writeLog ||
    ((level, text) => {
      if (level === 'error') console.error(text);
      else if (level === 'warn') console.warn(text);
      else console.log(text);
    });
  for (const e of result.log) {
    fn(e.level, e.text);
  }
}
