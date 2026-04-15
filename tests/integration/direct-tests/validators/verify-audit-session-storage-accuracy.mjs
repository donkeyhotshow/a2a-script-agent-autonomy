/**
 * Accuracy: `tasks/pending/session-storage-*.md` must match a fresh run of
 * `scripts/lib/session-storage-audit-analyze.mjs` (same logic as the generator).
 *
 * Run after `npm run audit:session-storage` or expect mismatches if tasks are stale.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeSession, buildClusters } from '../../../../scripts/scripts/lib/session-storage-audit-analyze.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const sessionsRoot = path.join(repoRoot, 'a2a-client', 'storage', 'sessions');
const pendingRoot = path.join(repoRoot, 'tasks', 'pending');

function taskFileName(sessionId) {
  return `session-storage-${sessionId}-structure-audit.md`;
}

function extractSection(md, name) {
  const h = `## ${name}`;
  const i = md.indexOf(h);
  if (i === -1) return null;
  const after = md.slice(i + h.length);
  const next = after.search(/\n## /);
  const body = (next === -1 ? after : after.slice(0, next)).trim();
  return body;
}

function parseFindings(section) {
  if (!section) return [];
  return section
    .split('\n')
    .filter((l) => /^\s*-\s*\[\s*\]\s+/.test(l))
    .map((l) => l.replace(/^\s*-\s*\[\s*\]\s+/, '').trim())
    .sort();
}

function parseEvidence(section) {
  if (!section) return [];
  const t = section.trim();
  if (t === '- (no direct file evidence captured)' || t === '(no direct file evidence captured)') {
    return [];
  }
  const out = [];
  for (const line of section.split('\n')) {
    const m = line.match(/^\s*-\s*`([^`]+)`\s*$/);
    if (m) out.push(m[1].replace(/\\/g, '/'));
  }
  return out.sort();
}

function setsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function main() {
  const errors = [];

  if (!fs.existsSync(sessionsRoot)) {
    console.log('verify-audit-session-storage-accuracy: skip (no sessions root)');
    return;
  }

  const sessionIds = fs
    .readdirSync(sessionsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('sess_'))
    .map((d) => d.name)
    .sort();

  const bad = [];
  for (const sid of sessionIds) {
    const r = analyzeSession(repoRoot, sid);
    if (r.issues.length > 0) bad.push(r);
  }

  for (const sid of sessionIds) {
    const r = analyzeSession(repoRoot, sid);
    const fp = path.join(pendingRoot, taskFileName(sid));
    const exists = fs.existsSync(fp);

    if (r.issues.length === 0) {
      if (exists) {
        errors.push(`Clean session ${sid} still has task file (stale): ${path.relative(repoRoot, fp)}`);
      }
      continue;
    }

    if (!exists) {
      errors.push(`Session ${sid} has ${r.issues.length} issue(s) but missing task file: ${taskFileName(sid)}`);
      continue;
    }

    const md = fs.readFileSync(fp, 'utf8');
    const findings = parseFindings(extractSection(md, 'Findings'));
    const evidence = parseEvidence(extractSection(md, 'Evidence paths'));

    if (!setsEqual(findings, r.issues)) {
      errors.push(
        `Findings mismatch for ${sid}:\n  file: ${JSON.stringify(findings)}\n  disk: ${JSON.stringify(r.issues)}`
      );
    }
    if (!setsEqual(evidence, r.evidence.map((e) => e.replace(/\\/g, '/')))) {
      errors.push(
        `Evidence mismatch for ${sid}:\n  file: ${JSON.stringify(evidence)}\n  disk: ${JSON.stringify(r.evidence.map((e) => e.replace(/\\/g, '/')))}`
      );
    }
  }

  const clusters = buildClusters(bad);
  for (const key of clusters.keys()) {
    const c = clusters.get(key);
    if (!c?.sessions.size) continue;
    const file = `session-storage-cluster-${key}.md`;
    const fp = path.join(pendingRoot, file);
    if (!fs.existsSync(fp)) {
      errors.push(`Missing cluster task file: ${file}`);
      continue;
    }
    const sortedIssues = [...c.issues].sort();
    const expected = sortedIssues.slice(0, 40);
    const md = fs.readFileSync(fp, 'utf8');
    const rep = parseFindings(extractSection(md, 'Representative findings'));
    if (!setsEqual(rep, expected)) {
      errors.push(
        `Cluster ${key} representative findings mismatch:\n  file: ${JSON.stringify(rep)}\n  expected: ${JSON.stringify(expected)}`
      );
    }
  }

  const expectedClusterBasenames = [...clusters.keys()]
    .filter((k) => clusters.get(k)?.sessions.size)
    .sort()
    .map((k) => `session-storage-cluster-${k}.md`);

  if (fs.existsSync(pendingRoot)) {
    for (const ent of fs.readdirSync(pendingRoot, { withFileTypes: true })) {
      if (!ent.isFile() || !ent.name.startsWith('session-storage-cluster-')) continue;
      if (ent.name === 'session-storage-clusters-summary.md') continue;
      if (!expectedClusterBasenames.includes(ent.name)) {
        errors.push(`Stale cluster file (no longer in analysis): ${ent.name}`);
      }
    }
  }

  if (errors.length) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log(
    `verify-audit-session-storage-accuracy: ok (${sessionIds.length} sessions, ${bad.length} with issues, ${expectedClusterBasenames.length} clusters)`
  );
}

main();
