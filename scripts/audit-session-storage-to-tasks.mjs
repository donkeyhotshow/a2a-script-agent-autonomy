#!/usr/bin/env node
/**
 * Structural drift in `a2a-client/storage/sessions/**` → `tasks/pending/session-storage-*.md`.
 * Regenerates per-session and cluster task files; removes stale files when drift clears.
 * No content MD5 — rewrite is deterministic from disk analysis only.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeSession, buildClusters } from './scripts/lib/session-storage-audit-analyze.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

/** Contract: embedded in every generated task (verified by verify-audit-session-storage-generator). */
const GENERATED_TASK_WORKFLOW = `
**GENERATED_TASK_WORKFLOW**

**Before execution:** Read Findings and Evidence paths; analyze structural drift; do not delete session JSON without a backup.

**After execution:** Delete this generated task file after fixes (or when findings are resolved and audit re-run clears the file).
`.trim();

const sessionsRoot = path.join(repoRoot, 'a2a-client', 'storage', 'sessions');
const pendingRoot = path.join(repoRoot, 'tasks', 'pending');

function taskFileName(sessionId) {
  return `session-storage-${sessionId}-structure-audit.md`;
}

function renderSessionTask(sessionId, issues, evidence) {
  const findings = issues.map((i) => `- [ ] ${i}`).join('\n');
  const evBlock =
    evidence.length > 0
      ? evidence.map((e) => `- \`${e}\``).join('\n')
      : '- (no direct file evidence captured)';
  return `# Session storage structure audit: ${sessionId}

## Task handling (generated)

${GENERATED_TASK_WORKFLOW}

## Findings

${findings}

## Evidence paths

${evBlock}
`;
}

function renderClusterTask(clusterKey, representativeFindings) {
  const lines = representativeFindings.map((i) => `- [ ] ${i}`).join('\n');
  return `# Session storage cluster: ${clusterKey}

## Task handling (generated)

${GENERATED_TASK_WORKFLOW}

## Representative findings

${lines}
`;
}

function ensurePendingDir() {
  if (!fs.existsSync(pendingRoot)) {
    fs.mkdirSync(pendingRoot, { recursive: true });
  }
}

function main() {
  ensurePendingDir();

  const sessionIds = fs.existsSync(sessionsRoot)
    ? fs
        .readdirSync(sessionsRoot, { withFileTypes: true })
        .filter((d) => d.isDirectory() && d.name.startsWith('sess_'))
        .map((d) => d.name)
        .sort()
    : [];

  const bad = [];
  for (const sid of sessionIds) {
    const r = analyzeSession(repoRoot, sid);
    const fp = path.join(pendingRoot, taskFileName(sid));
    if (r.issues.length > 0) {
      bad.push(r);
      fs.writeFileSync(fp, renderSessionTask(sid, r.issues, r.evidence), 'utf8');
    } else if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
    }
  }

  const clusters = buildClusters(bad);
  const expectedClusterBasenames = [];

  for (const [key, c] of clusters) {
    if (!c?.sessions.size) continue;
    const sortedIssues = [...c.issues].sort();
    const representative = sortedIssues.slice(0, 40);
    const file = `session-storage-cluster-${key}.md`;
    expectedClusterBasenames.push(file);
    const fp = path.join(pendingRoot, file);
    fs.writeFileSync(fp, renderClusterTask(key, representative), 'utf8');
  }

  if (fs.existsSync(pendingRoot)) {
    for (const ent of fs.readdirSync(pendingRoot, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.startsWith('session-storage-cluster-')) continue;
      if (ent.name === 'session-storage-clusters-summary.md') continue;
      if (!expectedClusterBasenames.includes(ent.name)) {
        fs.unlinkSync(path.join(pendingRoot, ent.name));
      }
    }
  }

  console.log(
    `audit-session-storage-to-tasks: ok (${sessionIds.length} sessions, ${bad.length} with issues, ${expectedClusterBasenames.length} cluster files)`
  );
}

main();
