/**
 * Session storage structural audit → tasks/pending/*.md
 *
 * Engine-check semantics:
 * - Task body is deterministic (no dates/timestamps).
 * - MD5 of UTF-8 body decides whether to rewrite (skip if unchanged).
 * - When a session/cluster no longer has issues, the corresponding task file is deleted.
 * - Manifest: tasks/pending/session-storage-audit-manifest.json (hashes only, no dates).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const repoRoot = process.cwd();
const sessionsRoot = path.join(repoRoot, 'a2a-client', 'storage', 'sessions');
const pendingRoot = path.join(repoRoot, 'tasks', 'pending');
const manifestPath = path.join(pendingRoot, 'session-storage-audit-manifest.json');

function md5utf8(s) {
  return crypto.createHash('md5').update(s, 'utf8').digest('hex');
}

function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

function listStepDirs(sessionDir) {
  try {
    return fs
      .readdirSync(sessionDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
      .map((d) => Number(d.name))
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function checkChoiceShape(choice, idx) {
  const issues = [];
  const id = choice?.id;
  const label = choice?.label;
  const description = choice?.description;
  if (typeof id !== 'string' || !id.trim()) {
    issues.push(`choice[${idx}] missing string id`);
  } else {
    if (/\*ID:\*\*/i.test(id) || /`/.test(id)) {
      issues.push(`choice[${idx}] id contains markdown noise: "${id}"`);
    }
  }
  if (typeof label !== 'string' || !label.trim()) {
    issues.push(`choice[${idx}] missing string label`);
  } else if (/^\*|`|\*ID:\*\*/i.test(label)) {
    issues.push(`choice[${idx}] label contains markdown noise: "${label}"`);
  }
  if (description != null && typeof description !== 'string') {
    issues.push(`choice[${idx}] description is not string`);
  } else if (
    typeof description === 'string' &&
    (/^\*|`/.test(description) || /\*Description:\*\*/i.test(description))
  ) {
    issues.push(`choice[${idx}] description contains markdown noise: "${description}"`);
  }
  return issues;
}

function analyzeSession(sessionId) {
  const sessionDir = path.join(sessionsRoot, sessionId);
  const issues = [];
  const evidence = [];

  const indexPath = path.join(sessionDir, 'session-index.json');
  if (!fs.existsSync(indexPath)) {
    issues.push('missing session-index.json');
    return { sessionId, issues, evidence };
  }

  const idx = safeReadJson(indexPath);
  if (!idx.ok) {
    issues.push(`invalid session-index.json: ${idx.error}`);
    return { sessionId, issues, evidence };
  }
  const index = idx.value;

  if (!Array.isArray(index.steps)) {
    issues.push('session-index.steps is not array');
    return { sessionId, issues, evidence };
  }

  const stepDirs = listStepDirs(sessionDir);
  const indexSteps = index.steps.map((s) => Number(s?.step)).filter(Number.isFinite).sort((a, b) => a - b);

  for (const s of stepDirs) {
    if (!indexSteps.includes(s)) {
      issues.push(`step directory ${s} missing in session-index.steps`);
      evidence.push(path.join('a2a-client', 'storage', 'sessions', sessionId, String(s)));
    }
  }
  for (const s of indexSteps) {
    if (!stepDirs.includes(s)) {
      issues.push(`session-index step ${s} has no directory`);
    }
  }

  for (const row of index.steps) {
    const stepNum = Number(row?.step);
    if (!Number.isFinite(stepNum)) continue;
    const stepDir = path.join(sessionDir, String(stepNum));
    const clientFile = path.join(stepDir, 'client-result.json');
    const serverFile = path.join(stepDir, 'server-response.json');
    const reqFile = path.join(stepDir, 'request-to-server.json');

    if (row?.hasClientResult === true && !fs.existsSync(clientFile)) {
      issues.push(`step ${stepNum}: hasClientResult=true but client-result.json missing`);
    }
    if (row?.hasServerResponse === true && !fs.existsSync(serverFile)) {
      issues.push(`step ${stepNum}: hasServerResponse=true but server-response.json missing`);
    }
    if (row?.hasServerResponse === false && fs.existsSync(serverFile)) {
      issues.push(`step ${stepNum}: hasServerResponse=false but server-response.json exists`);
    }

    for (const f of [clientFile, serverFile, reqFile]) {
      if (!fs.existsSync(f)) continue;
      const parsed = safeReadJson(f);
      if (!parsed.ok) {
        issues.push(`step ${stepNum}: invalid JSON in ${path.basename(f)} (${parsed.error})`);
        continue;
      }
      const doc = parsed.value;
      if (doc?.context && Object.prototype.hasOwnProperty.call(doc.context, 'session_id')) {
        issues.push(`step ${stepNum}: contains internal context.session_id in ${path.basename(f)}`);
        evidence.push(path.join('a2a-client', 'storage', 'sessions', sessionId, String(stepNum), path.basename(f)));
      }
      const choices = doc?.execute?.form?.choices;
      if (Array.isArray(choices)) {
        choices.forEach((c, i) => {
          const cIssues = checkChoiceShape(c, i);
          for (const ci of cIssues) {
            issues.push(`step ${stepNum}: ${ci}`);
            evidence.push(path.join('a2a-client', 'storage', 'sessions', sessionId, String(stepNum), path.basename(f)));
          }
        });
      }
    }
  }

  return { sessionId, issues: Array.from(new Set(issues)).sort(), evidence: Array.from(new Set(evidence)).sort() };
}

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

## Why
Session JSON structure has contract violations or suspicious shape drift; needs normalization and root-cause fix in client storage pipeline.

## Findings
${issueLines}

## Evidence paths
${evidenceLines}

## Acceptance
- [ ] Reproduce each issue from live step artifacts.
- [ ] Fix write/projection path so new sessions do not produce the same issue.
- [ ] Validate by running \`npm run audit:session-storage\` until this file is removed automatically.
`;
}

function classifyIssue(issue) {
  if (/context\.session_id/i.test(issue)) return 'internal-session-id-leak';
  if (/label contains markdown noise|description contains markdown noise|id contains markdown noise/i.test(issue)) {
    return 'router-choice-shape-drift';
  }
  if (/missing in session-index|has no directory|hasServerResponse=.*missing|hasServerResponse=.*exists/i.test(issue)) {
    return 'session-index-step-drift';
  }
  if (/invalid JSON|missing session-index|session-index\.steps is not array/i.test(issue)) {
    return 'storage-json-integrity';
  }
  return 'other-structure-issues';
}

function buildClusters(allBad) {
  const clusters = new Map();
  for (const row of allBad) {
    for (const issue of row.issues) {
      const key = classifyIssue(issue);
      if (!clusters.has(key)) {
        clusters.set(key, { key, issues: new Set(), sessions: new Set() });
      }
      const c = clusters.get(key);
      c.issues.add(issue);
      c.sessions.add(row.sessionId);
    }
  }
  return clusters;
}

function renderClusterTask(key, sessions, issues) {
  const sortedSessions = [...sessions].sort();
  const sortedIssues = [...issues].sort();
  return `# Session storage cluster: ${key}

## Why
This task groups the same storage defect class across multiple sessions to fix root cause once.

## Sessions (${sortedSessions.length})
${sortedSessions.map((s) => `- \`${s}\``).join('\n')}

## Representative findings
${sortedIssues.slice(0, 40).map((i) => `- [ ] ${i}`).join('\n')}

## Acceptance
- [ ] Identify root cause in write/projection pipeline.
- [ ] Add/adjust sanitizer/normalizer/tests for this defect class.
- [ ] Re-run \`npm run audit:session-storage\` until this file is removed automatically.
`;
}

function writeIfChanged(filePath, content) {
  const nextHash = md5utf8(content);
  if (fs.existsSync(filePath)) {
    const prev = fs.readFileSync(filePath, 'utf8');
    if (md5utf8(prev) === nextHash) {
      return { action: 'unchanged', hash: nextHash };
    }
  }
  fs.writeFileSync(filePath, content, 'utf8');
  return { action: 'written', hash: nextHash };
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
    const r = analyzeSession(sid);
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

  const manifest = { version: 1, files: {} };

  for (const row of bad) {
    const content = renderSessionTask(row);
    const fp = path.join(pendingRoot, taskFileName(row.sessionId));
    const { action, hash } = writeIfChanged(fp, content);
    manifest.files[path.relative(repoRoot, fp).replace(/\\/g, '/')] = hash;
    if (action === 'written') {
      /* noop log */
    }
  }

  const summaryPath = path.join(pendingRoot, 'session-storage-audit-summary.md');
  const summaryContent = renderAuditSummary(sessionIds.length, bad);
  writeIfChanged(summaryPath, summaryContent);
  manifest.files[path.relative(repoRoot, summaryPath).replace(/\\/g, '/')] = md5utf8(summaryContent);

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
    const { hash } = writeIfChanged(fp, content);
    manifest.files[path.relative(repoRoot, fp).replace(/\\/g, '/')] = hash;
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
  writeIfChanged(clustersSummaryPath, clustersSummaryContent);
  manifest.files[path.relative(repoRoot, clustersSummaryPath).replace(/\\/g, '/')] = md5utf8(clustersSummaryContent);

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Scanned: ${sessionIds.length}`);
  console.log(`Problematic: ${bad.length}`);
  console.log(`Removed session tasks (clean): ${deletedSessions}`);
  console.log(`Removed stale cluster tasks: ${removedClusters}`);
  console.log(`Manifest: ${path.relative(repoRoot, manifestPath)}`);
  console.log(`Active clusters: ${writtenClusterBasenames.length}`);
}

main();
