/**
 * Session storage structural audit → tasks/pending/*.md
 *
 * Engine-check semantics:
 * - Task body is deterministic (no dates/timestamps).
 * - Always rewrites generated files (no content-hash skip).
 * - When a session/cluster no longer has issues, the corresponding task file is deleted.
 *
 * Operator workflow for generated task files is embedded in each task (see GENERATED_TASK_WORKFLOW).
 */
import fs from 'fs';
import path from 'path';
import { analyzeSession, buildClusters } from './lib/session-storage-audit-analyze.mjs';
import { walkDirsRecursive } from '../../a2a-server/src/fs-utils/recursive-directory-walker.js';

const repoRoot = process.cwd();
const sessionsRoot = path.join(repoRoot, 'a2a-client', 'storage', 'sessions');
const pendingRoot = path.join(repoRoot, 'tasks', 'pending');

/** Standard block for every auto-generated task Markdown under tasks/pending/. */
const GENERATED_TASK_WORKFLOW = `## Task handling (generated)
- **Before execution:** Analyze this file and cited evidence; confirm scope, risks, and acceptance criteria.
- **After execution:** Delete this Markdown file when the work is done. Run \`npm run audit:session-storage\` to confirm the audit does not recreate it (or that any remaining findings are intentional).
`;

function taskFileName(sessionId) {
  return `session-storage-${sessionId}-structure-audit.md`;
}

function renderSessionTask(result) {
  const issueLines = result.issues.map((i) => `- [ ] ${i}`).join('\n');
  const evidenceLines =
    result.evidence.length > 0
      ? result.evidence.map((e) => `- \`${e.replace(/\\/g, '/')}\``).join('\n')
      : '- (no direct file evidence captured)';
  return `# Session storage audit: ${result.sessionId}

${GENERATED_TASK_WORKFLOW}

## Why
Session JSON structure has contract violations or suspicious shape drift; needs normalization and root-cause fix in client storage pipeline.

## Findings
${issueLines}

## Evidence paths
${evidenceLines}

## Acceptance
- [ ] Reproduce each issue from live step artifacts.
- [ ] Fix write/projection path so new sessions do not produce the same issue.
- [ ] Validate by running \`npm run audit:session-storage\` until this file is removed automatically when storage is clean.
`;
}

function renderClusterTask(key, sessions, issues) {
  const sortedSessions = [...sessions].sort();
  const sortedIssues = [...issues].sort();
  return `# Session storage cluster: ${key}

${GENERATED_TASK_WORKFLOW}

## Why
This task groups the same storage defect class across multiple sessions to fix root cause once.

## Sessions (${sortedSessions.length})
${sortedSessions.map((s) => `- \`${s}\``).join('\n')}

## Representative findings
${sortedIssues.slice(0, 40).map((i) => `- [ ] ${i}`).join('\n')}

## Acceptance
- [ ] Identify root cause in write/projection pipeline.
- [ ] Add/adjust sanitizer/normalizer/tests for this defect class.
- [ ] Re-run \`npm run audit:session-storage\` until this file is removed automatically when storage is clean.
`;
}

function deleteIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

function renderAuditSummary(sessionCount, bad) {
  const summaryRows =
    bad.length === 0
      ? 'No structural issues found.'
      : bad
          .map((b) => `- [ ] \`${b.sessionId}\` — ${b.issues.length} issue(s), task: \`${taskFileName(b.sessionId)}\``)
          .join('\n');
  return `# Session storage audit summary

Scanned sessions: ${sessionCount}
Problematic sessions: ${bad.length}

Per-session and cluster task files under \`tasks/pending/\` include **Task handling (generated)** (analyze before work; delete the file after).

## Tasks
${summaryRows}
`;
}

function renderClustersSummary(clusterMeta) {
  const lines =
    clusterMeta.length === 0
      ? 'No clusters.'
      : clusterMeta
          .sort((a, b) => b.sessions - a.sessions)
          .map(
            (r) =>
              `- [ ] \`${r.key}\` — sessions: ${r.sessions}, findings: ${r.findings}, task: \`${r.file}\``
          )
          .join('\n');
  return `# Session storage clusters summary

## Cluster tasks
${lines}
`;
}

function cleanupStaleClusterFiles(expectedBasenames) {
  const active = new Set(expectedBasenames);
  let removed = 0;
  if (!fs.existsSync(pendingRoot)) return removed;
  for (const ent of fs.readdirSync(pendingRoot, { withFileTypes: true })) {
    if (!ent.isFile()) continue;
    if (!ent.name.startsWith('session-storage-cluster-')) continue;
    if (ent.name === 'session-storage-clusters-summary.md') continue;
    if (!active.has(ent.name)) {
      fs.unlinkSync(path.join(pendingRoot, ent.name));
      removed++;
    }
  }
  return removed;
}

function main() {
  if (!fs.existsSync(sessionsRoot)) {
    console.error(`Sessions root not found: ${sessionsRoot}`);
    process.exit(1);
  }
  fs.mkdirSync(pendingRoot, { recursive: true });

  const sessionIds = fs
    .readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('sess_'))
    .map((d) => d.name)
    .sort();

  const bad = [];
  for (const sid of sessionIds) {
    const r = analyzeSession(repoRoot, sid);
    if (r.issues.length > 0) {
      bad.push(r);
    }
  }

  const badSet = new Set(bad.map((b) => b.sessionId));
  let deletedSessions = 0;
  for (const sid of sessionIds) {
    if (!badSet.has(sid)) {
      const p = path.join(pendingRoot, taskFileName(sid));
      if (deleteIfExists(p)) deletedSessions++;
    }
  }

  for (const row of bad) {
    const content = renderSessionTask(row);
    const fp = path.join(pendingRoot, taskFileName(row.sessionId));
    fs.writeFileSync(fp, content, 'utf8');
  }

  const summaryPath = path.join(pendingRoot, 'session-storage-audit-summary.md');
  const summaryContent = renderAuditSummary(sessionIds.length, bad);
  fs.writeFileSync(summaryPath, summaryContent, 'utf8');

  const clusters = buildClusters(bad);
  const clusterMeta = [];
  const writtenClusterBasenames = [];

  for (const key of [...clusters.keys()].sort((a, b) => a.localeCompare(b))) {
    const c = clusters.get(key);
    if (!c || c.sessions.size === 0) continue;
    const file = `session-storage-cluster-${key}.md`;
    writtenClusterBasenames.push(file);
    const fp = path.join(pendingRoot, file);
    const content = renderClusterTask(key, c.sessions, c.issues);
    fs.writeFileSync(fp, content, 'utf8');
    clusterMeta.push({
      key,
      file,
      sessions: c.sessions.size,
      findings: c.issues.size,
    });
  }

  const removedClusters = cleanupStaleClusterFiles(writtenClusterBasenames);

  const clustersSummaryPath = path.join(pendingRoot, 'session-storage-clusters-summary.md');
  const clustersSummaryContent = renderClustersSummary(clusterMeta);
  fs.writeFileSync(clustersSummaryPath, clustersSummaryContent, 'utf8');

  const legacyManifest = path.join(pendingRoot, 'session-storage-audit-manifest.json');
  if (fs.existsSync(legacyManifest)) {
    fs.unlinkSync(legacyManifest);
    console.log(`Removed legacy manifest: ${path.relative(repoRoot, legacyManifest)}`);
  }

  console.log(`Scanned: ${sessionIds.length}`);
  console.log(`Problematic: ${bad.length}`);
  console.log(`Removed session tasks (clean): ${deletedSessions}`);
  console.log(`Removed stale cluster tasks: ${removedClusters}`);
  console.log(`Active clusters: ${writtenClusterBasenames.length}`);
}

main();
