#!/usr/bin/env node
/**
 * GET AI hub `/promises/pending` (+ optional `/promises/errors`) when async stays pending (PROMISE_DAEMON_ONLY).
 * Optional: `WEB_BASE` (e.g. http://localhost:5173) → also GET `/api/a2a/hub/promises/pending|errors` (probe normalizes localhost → 127.0.0.1).
 *
 * Usage: `node tests/monitor-tasks/check-promise-queue.mjs`  or  `npm run check:promise-queue`
 * Flags:
 *   `--strict` — exit 1 if any ticket in `/promises/errors`
 *   `--no-errors` — skip error queue
 *   `--no-health` — skip GET /health
 *   `--json` — stdout = JSON report only (CI / jq); see `probeToJsonReport`
 *   `--detail` — hub `/promises/errors?detail=1` (full error text per row)
 *   `--compact` — one id per line (no timestamps / paths / log_folder)
 *
 * Env:
 *   AI_HUB_URL — hub base (default http://localhost:11434)
 *   WEB_BASE — Vite / Client API origin for hub proxy probe
 *   PROMISES_CHECK_ERRORS=0 — skip `/promises/errors` (default: check errors)
 *   PROMISES_CHECK_HEALTH=0 — skip `/health`
 *   PROMISES_STRICT=1 — same as `--strict`
 *   PROMISES_ERRORS_DETAIL=1 — same as `--detail` (also TASK_MONITOR_ERRORS_DETAIL)
 *   PROMISES_COMPACT_LOG=1 — same as `--compact`
 *   PROMISES_JSON_MAX_ROWS — cap rows in `--json` output (default 40)
 *   TASK_MONITOR_HUB_PENDING_TIMEOUT_MS — fetch timeout (default 20000)
 *
 * See: a2a-ai-hub/docs/api-reference/PROXY_API.md
 *
 * Task Monitor uses the same probe (`promise-queue-probe.mjs`) via
 * `logHubPromiseQueueSnapshot()` after the promise gate and when a task fails or times out.
 * Disable: `TASK_MONITOR_SKIP_HUB_PENDING_PROBE=1`.
 */
import {
  probePromiseQueues,
  emitProbeLogLines,
  probeToJsonReport,
} from './promise-queue-probe.mjs';

/** Pipes closed early (e.g. `| head` on Windows) — avoid libuv / broken-pipe noise. */
function swallowBrokenPipeOnStdio() {
  for (const stream of [process.stdout, process.stderr]) {
    if (stream && typeof stream.on === 'function') {
      stream.on('error', (err) => {
        const c = err && typeof err === 'object' ? err.code : '';
        if (c === 'EPIPE' || c === 'ERR_STREAM_WRITE_AFTER_END') return;
      });
    }
  }
}
swallowBrokenPipeOnStdio();

const argv = process.argv.slice(2);
const strict = argv.includes('--strict') || process.env.PROMISES_STRICT === '1';
const checkErrors = !argv.includes('--no-errors') && process.env.PROMISES_CHECK_ERRORS !== '0';
const checkHealth = !argv.includes('--no-health') && process.env.PROMISES_CHECK_HEALTH !== '0';
const asJson = argv.includes('--json');
const detail =
  argv.includes('--detail') ||
  /^(1|true|yes)$/i.test(String(process.env.PROMISES_ERRORS_DETAIL || '').trim()) ||
  /^(1|true|yes)$/i.test(String(process.env.TASK_MONITOR_ERRORS_DETAIL || '').trim());
const compact = argv.includes('--compact');

const base = (process.env.AI_HUB_URL || 'http://localhost:11434').replace(/\/$/, '');
const webBase = (process.env.WEB_BASE || '').replace(/\/$/, '');
const ms = Math.max(1000, parseInt(process.env.TASK_MONITOR_HUB_PENDING_TIMEOUT_MS || '20000', 10));

try {
  const result = await probePromiseQueues({
    hubBase: base,
    webBase,
    timeoutMs: ms,
    checkHealth,
    checkErrors,
    pendingNonOkIsError: true,
    errorsDetail: detail,
    richLogLines: !compact,
  });

  if (asJson) {
    const report = probeToJsonReport(result);
    report.strictWouldFail = Boolean(
      strict && checkErrors && result.errors.count > 0
    );
    report.hubBase = base;
    report.webBase = webBase || null;
    console.log(JSON.stringify(report, null, 2));
  } else {
    emitProbeLogLines(result);
  }

  let errorCount = 0;
  if (checkErrors && result.errors.count >= 0) {
    errorCount = result.errors.count;
  }

  if (strict && checkErrors && errorCount > 0) {
    if (!asJson) {
      console.error(
        `[strict] ${errorCount} ticket(s) in /promises/errors - retry or delete (see PROXY_API.md)`
      );
    }
    setImmediate(() => process.exit(1));
  } else {
    setImmediate(() => process.exit(0));
  }
} catch (e) {
  console.error(e.message || e);
  setImmediate(() => process.exit(1));
}
