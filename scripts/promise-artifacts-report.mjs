#!/usr/bin/env node
/**
 * Build a Markdown report for one server promiseId: artifacts across storages + Gray Room steps.
 *
 * Documented in: tests/direct-tests/README.md, tests/direct-tests/validators/README.md,
 * AGENTS.md (Quick Reference), MONITOR-QUICK-START.md, cross-system-contracts/README.md,
 * README.md (Testing). npm: `npm run report:promise -- <id> [--out file.md] [--logs]`
 *
 * Usage:
 *   node scripts/promise-artifacts-report.mjs <promiseId> [--out report.md] [--logs]
 *
 * Env (optional):
 *   REQUESTS_STORAGE_PATH — default <repo>/a2a-server/storage/requests
 *   A2A_CLIENT_STORAGE_DIR — default <repo>/a2a-client/storage
 *   AI_INTEGRATION_ROOT — default <repo>/ai-integration
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listFilesRecursive } from '../../a2a-server/src/fs-utils/recursive-directory-walker.js';
import { getRepoRoot } from '../../a2a-server/src/fs-utils/repo-root.js';
import { safeReadJson } from '../../a2a-server/src/fs-utils/safe-json.js';

const REPO_ROOT = getRepoRoot();

function parseArgs(argv) {
  const args = { out: null, logs: false, id: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--out' && argv[i + 1]) {
      args.out = path.resolve(argv[++i]);
    } else if (argv[i] === '--logs') {
      args.logs = true;
    } else if (!argv[i].startsWith('-') && !args.id) {
      args.id = argv[i];
    }
  }
  return args;
}

// Replaced with direct fs.existsSync call
// function exists(p) {
//   return fs.existsSync(p);
// }
}

// Using utility function from @/fs-utils/safe-json.js
// function safeReadJson(filePath) {
//   try {
//     const t = fs.readFileSync(filePath, 'utf8');
//     return JSON.parse(t);
//   } catch {
//     return null;
//   }
// }

function normalizePromiseId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim();
}

// Using utility function from @/fs-utils/recursive-directory-walker.js


function findClientSessionRefs(storageRoot, promiseId) {
  const sessionsDir = path.join(storageRoot, 'sessions');
  const hits = [];
  if (!exists(sessionsDir)) return hits;
  const sessionDirs = fs.readdirSync(sessionsDir, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const sd of sessionDirs) {
    const sid = sd.name;
    const sessionPath = path.join(sessionsDir, sid);
    const steps = fs.readdirSync(sessionPath, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const st of steps) {
      if (!/^\d+$/.test(st.name)) continue;
      const stepNum = st.name;
      const stepDir = path.join(sessionPath, stepNum);
      const promPath = path.join(stepDir, 'server-promise.json');
      const respPath = path.join(stepDir, 'server-response.json');
      if (exists(promPath)) {
        const p = safeReadJson(promPath);
        if (p && (p.promiseId === promiseId || String(p.promiseId || '').includes(promiseId))) {
          hits.push({
            sessionId: sid,
            step: stepNum,
            type: 'server-promise.json',
            snapshot: p,
          });
        }
      }
      if (exists(respPath)) {
        try {
          const raw = fs.readFileSync(respPath, 'utf8');
          if (raw.includes(promiseId)) {
            hits.push({
              sessionId: sid,
              step: stepNum,
              type: 'server-response.json (mentions promise id in body)',
              snapshot: {},
            });
          }
        } catch (_) {}
      }
    }
  }
  return hits;
}

function getSlots(ctx) {
  const wb = ctx?.workbench;
  if (!wb || typeof wb !== 'object') return {};
  const slots = wb.slots;
  return slots && typeof slots === 'object' ? slots : {};
}

function summarizeTraceRow(ev, i) {
  if (!ev || typeof ev !== 'object') return `- ${i + 1}. (invalid)`;
  const k = ev.kind || '?';
  const parts = [k];
  if (ev.reason) parts.push(`reason=${ev.reason}`);
  if (ev.interruptReason) parts.push(`interrupt=${ev.interruptReason}`);
  if (ev.detail) parts.push(`detail=${ev.detail}`);
  if (ev.phase) parts.push(`phase=${ev.phase}`);
  if (ev.purpose) parts.push(`purpose=${ev.purpose}`);
  if (ev.ok !== undefined) parts.push(`ok=${ev.ok}`);
  if (ev.chars !== undefined) parts.push(`chars=${ev.chars}`);
  if (ev.algorithmId) parts.push(`algorithm=${ev.algorithmId}`);
  return `- **${i + 1}.** ${parts.join(' · ')}`;
}

function formatOperationHistory(ops) {
  if (!Array.isArray(ops) || ops.length === 0) return '_none_\n';
  const lines = ops.map((op, i) => {
    if (!op || typeof op !== 'object') return `- ${i + 1}. (invalid)`;
    const t = op.operationType || op.type || '?';
    const st = op.status || '';
    const desc = (op.description || '').slice(0, 120);
    return `- **${i + 1}.** \`${t}\` ${st ? `(${st})` : ''} ${desc ? `— ${desc}` : ''}`;
  });
  return lines.join('\n') + '\n';
}

function scanLogSnippets(repoRoot, promiseId, maxLines = 120) {
  const logDirs = [path.join(repoRoot, 'a2a-server', 'logs'), path.join(repoRoot, 'a2a-server')];
  const snippets = [];
  const seen = new Set();
  for (const dir of logDirs) {
    if (!exists(dir)) continue;
    let files = [];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith('.log') || f === 'server.log');
    } catch {
      continue;
    }
    for (const f of files) {
      const fp = path.join(dir, f);
      if (seen.has(fp)) continue;
      seen.add(fp);
      let content = '';
      try {
        content = fs.readFileSync(fp, 'utf8');
      } catch {
        continue;
      }
      const lines = content.split(/\r?\n/);
      const matched = [];
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(promiseId)) {
          matched.push({ lineNo: i + 1, text: lines[i].slice(0, 500) });
          if (matched.length >= maxLines) break;
        }
      }
      if (matched.length) {
        snippets.push({ file: fp, rows: matched });
      }
    }
  }
  return snippets;
}

function buildMd({
  promiseId,
  repoRoot,
  serverPath,
  serverData,
  proxyFiles,
  clientHits,
  logSnippets,
  includeLogs,
}) {
  const now = new Date().toISOString();
  let md = `# Promise trace: \`${promiseId}\`\n\n`;
  md += `Generated: **${now}** (repo: \`${repoRoot}\`)\n\n`;
  md += `## Inventory\n\n`;
  md += `| Location | Status |\n|----------|--------|\n`;
  md += `| A2A server request file | ${exists(serverPath) ? '**found**' : '**missing**'} \`${serverPath}\` |\n`;
  const proxyRoot = path.join(process.env.AI_INTEGRATION_ROOT || path.join(repoRoot, 'ai-integration'), 'proxy_logs', 'promises', promiseId);
  md += `| AI Integration \`proxy_logs/promises/${promiseId}/\` | ${exists(proxyRoot) ? `**found** (${proxyFiles.length} files)` : '**missing**'} |\n`;
  md += `| Client session step refs | ${clientHits.length ? `**${clientHits.length}**` : 'none'} |\n`;
  md += `\n---\n\n`;

  md += `## Gray Room (ordered steps)\n\n`;
  md += `Canonical paths: \`context.workbench.slots.interruptTrace\`, \`context.workbench.slots.grayRoom\`, \`context.operationHistory\` ([interrupt-trace-contract](a2a-server/src/transform/interrupt-trace-contract.ts)).\n\n`;

  const ctx = serverData?.context && typeof serverData.context === 'object' ? serverData.context : null;
  const slots = ctx ? getSlots(ctx) : {};
  const trace = slots.interruptTrace;
  const grayRoom = slots.grayRoom;

  if (Array.isArray(trace) && trace.length > 0) {
    md += `### interruptTrace (${trace.length} events)\n\n`;
    md += trace.map((e, i) => summarizeTraceRow(e, i)).join('\n');
    md += `\n\n`;
  } else {
    md += `### interruptTrace\n\n_none in stored context_\n\n`;
  }

  if (grayRoom && typeof grayRoom === 'object') {
    md += `### grayRoom envelope\n\n\`\`\`json\n${JSON.stringify(grayRoom, null, 2)}\n\`\`\`\n\n`;
  } else {
    md += `### grayRoom envelope\n\n_none in stored context_\n\n`;
  }

  if (ctx && Array.isArray(ctx.operationHistory) && ctx.operationHistory.length) {
    md += `### operationHistory\n\n`;
    md += formatOperationHistory(ctx.operationHistory);
    md += `\n`;
  }

  md += `---\n\n## A2A server request snapshot\n\n`;
  if (!serverData) {
    md += `_File not found or unreadable._\n\n`;
  } else {
    const top = {
      status: serverData.status,
      promiseId: serverData.promiseId,
      createdAt: serverData.createdAt,
      completedAt: serverData.completedAt,
      retryCount: serverData.retryCount,
      retryAfter: serverData.retryAfter,
      requestPhase: ctx?.requestPhase,
    };
    md += `\`\`\`json\n${JSON.stringify(top, null, 2)}\n\`\`\`\n\n`;
    const r = serverData.result;
    if (r && typeof r === 'object') {
      const execKeys = r.execute && typeof r.execute === 'object' ? Object.keys(r.execute) : [];
      md += `**result.execute keys:** ${execKeys.length ? execKeys.map((k) => `\`${k}\``).join(', ') : '_none_'}\n\n`;
    }
    if (serverData.error) {
      md += `**error:** \`\`\`json\n${JSON.stringify(serverData.error, null, 2)}\n\`\`\`\n\n`;
    }
  }

  md += `---\n\n## Client API storage (session steps)\n\n`;
  if (!clientHits.length) {
    md += `_No \`server-promise.json\` matching this id under \`a2a-client/storage/sessions\`._\n\n`;
  } else {
    for (const h of clientHits) {
      md += `- **${h.sessionId}** / step **${h.step}** — \`${h.type}\`\n`;
      if (h.snapshot && typeof h.snapshot === 'object') {
        const st = h.snapshot.status || h.snapshot.promiseStatus;
        if (st) md += `  - status: \`${st}\`\n`;
      }
    }
    md += `\n`;
  }

  md += `---\n\n## AI Integration (proxy_logs)\n\n`;
  const pdir = path.join(process.env.AI_INTEGRATION_ROOT || path.join(repoRoot, 'ai-integration'), 'proxy_logs', 'promises', promiseId);
  if (!proxyFiles.length) {
    md += `_No files under \`${pdir}\` (hub may not have logged this id, or path differs)._\n\n`;
  } else {
    md += `| File | Size (bytes) |\n|------|----------------|\n`;
    for (const f of proxyFiles.sort((a, b) => a.rel.localeCompare(b.rel))) {
      md += `| \`${f.rel}\` | ${f.size} |\n`;
    }
    md += `\n`;
  }

  if (includeLogs && logSnippets.length) {
    md += `---\n\n## Log snippets (promise id or Gray Room)\n\n`;
    for (const block of logSnippets) {
      md += `### \`${path.relative(repoRoot, block.file)}\`\n\n`;
      for (const row of block.rows.slice(0, 40)) {
        md += `\`${row.lineNo}\`: ${row.text.replace(/\r/g, '')}\n`;
      }
      md += `\n`;
    }
  }

  md += `---\n\n## Notes\n\n`;
  md += `- Server file path follows \`REQUESTS_STORAGE_PATH\` / default \`a2a-server/storage/requests/{id}.json\`.\n`;
  md += `- Gray Room runtime does not expose internal chains to the client response; this report uses **persisted** server request context when available.\n`;
  return md;
}

function main() {
  const args = parseArgs(process.argv);
  const promiseId = normalizePromiseId(args.id);
  if (!promiseId) {
    console.error('Usage: node scripts/promise-artifacts-report.mjs <promiseId> [--out report.md] [--logs]');
    process.exit(1);
  }

  const repoRoot = REPO_ROOT;
  const requestsDir =
    process.env.REQUESTS_STORAGE_PATH || path.join(repoRoot, 'a2a-server', 'storage', 'requests');
  const serverPath = path.join(requestsDir, `${promiseId}.json`);
  const serverData = safeReadJson(serverPath);

  const aiRoot = process.env.AI_INTEGRATION_ROOT || path.join(repoRoot, 'ai-integration');
  const proxyRoot = path.join(aiRoot, 'proxy_logs', 'promises', promiseId);
  const proxyFiles = listFilesRecursive(proxyRoot, proxyRoot);

  const clientStorage = process.env.A2A_CLIENT_STORAGE_DIR || path.join(repoRoot, 'a2a-client', 'storage');
  const clientHits = findClientSessionRefs(clientStorage, promiseId);

  const logSnippets = args.logs ? scanLogSnippets(repoRoot, promiseId) : [];

  const md = buildMd({
    promiseId,
    repoRoot,
    serverPath,
    serverData,
    proxyFiles,
    clientHits,
    logSnippets,
    includeLogs: args.logs,
  });

  if (args.out) {
    fs.writeFileSync(args.out, md, 'utf8');
    console.log(`Wrote ${args.out}`);
  } else {
    process.stdout.write(md);
  }
}

main();
