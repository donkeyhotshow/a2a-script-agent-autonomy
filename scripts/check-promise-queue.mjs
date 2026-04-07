#!/usr/bin/env node
/**
 * GET AI hub /promises/pending — quick probe when async stays pending (PROMISE_DAEMON_ONLY).
 * Usage: node scripts/check-promise-queue.mjs
 * Env: AI_HUB_URL (default http://localhost:11434)
 */
const base = (process.env.AI_HUB_URL || 'http://localhost:11434').replace(/\/$/, '');
const url = `${base}/promises/pending`;
try {
  const ms = Math.max(1000, parseInt(process.env.TASK_MONITOR_HUB_PENDING_TIMEOUT_MS || '20000', 10));
  const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
  const text = await r.text();
  if (!r.ok) {
    console.error(`${r.status} ${url}\n${text.slice(0, 500)}`);
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error('Not JSON:', text.slice(0, 200));
    process.exit(1);
  }
  const n = Array.isArray(data) ? data.length : 0;
  console.log(`${url} → ${n} pending`);
  if (n > 0 && Array.isArray(data)) {
    data.slice(0, 8).forEach((row, i) => {
      const id = row && typeof row === 'object' && row.id != null ? row.id : row;
      console.log(`  ${i + 1}. ${id}`);
    });
  }
  process.exit(0);
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
