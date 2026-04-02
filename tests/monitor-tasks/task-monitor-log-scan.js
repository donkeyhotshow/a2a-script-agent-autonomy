import fs from 'fs';
import path from 'path';

/** Known app log locations (repo-relative to process.cwd()). */
const DEFAULT_LOG_TARGETS = [
  { app: 'a2a-client', dir: 'a2a-client/logs', pattern: /\.log$/i, maxDepth: 12 },
  { app: 'a2a-server', dir: 'a2a-server/logs', pattern: /\.log$/i, maxDepth: 12 },
  { app: 'ai-integration', file: 'ai-integration/proxy.log' },
  { app: 'ai-integration', dir: 'ai-integration/proxy_logs', pattern: /\.log$/i, maxDepth: 3 },
];

const ERROR_LINE_RE =
  /npm ERR!|Traceback \(most recent call last\)|UnhandledPromiseRejection|uncaughtException|\bFATAL\b|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|"level"\s*:\s*"(error|fatal)"|\[(?:error|fatal)\]|(?:^|\s)Error:\s|\bException:\s|^\s*Error\s+[-—]/i;

function walkLogFiles(dir, pattern, maxDepth, depth = 0, out = []) {
  if (depth > maxDepth) return out;
  if (!fs.existsSync(dir)) return out;
  let st;
  try {
    st = fs.statSync(dir);
  } catch {
    return out;
  }
  if (!st.isDirectory()) return out;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkLogFiles(p, pattern, maxDepth, depth + 1, out);
    else if (pattern.test(e.name)) out.push(p);
  }
  return out;
}

function readTailUtf8(filePath, maxBytes) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size === 0) return '';
    const size = stat.size;
    const toRead = Math.min(maxBytes, size);
    const start = size - toRead;
    const buf = Buffer.alloc(toRead);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buf, 0, toRead, start);
    } finally {
      fs.closeSync(fd);
    }
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

class TaskMonitorLogScan {
  scanApplicationLogs(options = {}) {
    if (process.env.TASK_MONITOR_LOG_SCAN === '0') {
      return { filesScanned: 0, filePaths: [], hitCount: 0, hits: [], skipped: true };
    }

    const cwd = process.cwd();
    const maxTailBytes = options.maxTailBytes ?? parseInt(process.env.TASK_MONITOR_LOG_TAIL_BYTES || '262144', 10);
    const maxHitsPerFile = options.maxHitsPerFile ?? 25;
    const maxTotalHits = options.maxTotalHits ?? 200;
    const targets = options.targets ?? DEFAULT_LOG_TARGETS;

    const fileEntries = [];
    for (const t of targets) {
      if (t.file) {
        const fp = path.resolve(cwd, t.file);
        if (fs.existsSync(fp) && fs.statSync(fp).isFile()) {
          fileEntries.push({ app: t.app, path: fp });
        }
      }
      if (t.dir) {
        const d = path.resolve(cwd, t.dir);
        const depth = typeof t.maxDepth === 'number' ? t.maxDepth : 12;
        const pat = t.pattern || /\.log$/i;
        for (const p of walkLogFiles(d, pat, depth)) {
          fileEntries.push({ app: t.app, path: p });
        }
      }
    }

    const hits = [];
    const perFile = new Map();

    for (const { app, path: fp } of fileEntries) {
      if (hits.length >= maxTotalHits) break;
      const text = readTailUtf8(fp, maxTailBytes);
      const lines = text.split(/\r?\n/);
      let count = perFile.get(fp) || 0;
      for (const line of lines) {
        if (hits.length >= maxTotalHits || count >= maxHitsPerFile) break;
        if (!line || !ERROR_LINE_RE.test(line)) continue;
        if (/no error|0 errors|errors?:\s*\[\s*\]|error:\s*null\b/i.test(line)) continue;
        hits.push({ app, file: fp, line: line.length > 500 ? `${line.slice(0, 497)}...` : line });
        count++;
        perFile.set(fp, count);
      }
    }

    return {
      filesScanned: fileEntries.length,
      filePaths: fileEntries.map(e => e.path),
      hitCount: hits.length,
      hits,
    };
  }

  reportLogScanHits(hits) {
    if (!hits?.length) return;
    console.warn(`\n[log-scan] ${hits.length} error-like line(s) in application logs:`);
    for (const h of hits.slice(0, 40)) {
      console.warn(`  [${h.app}] ${path.relative(process.cwd(), h.file)}: ${h.line}`);
    }
    if (hits.length > 40) console.warn(`  ... and ${hits.length - 40} more`);
  }
}

export { TaskMonitorLogScan, DEFAULT_LOG_TARGETS, ERROR_LINE_RE };
