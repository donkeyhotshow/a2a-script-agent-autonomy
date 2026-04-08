/**
 * Shared structural analysis for `a2a-client/storage/sessions/{sess_*}/`.
 * Used by `audit-session-storage-to-tasks.mjs` and accuracy validators.
 */
import fs from 'fs';
import path from 'path';
import { listStepDirs } from '../../a2a-server/src/fs-utils/recursive-directory-walker.js';

/** Repo-relative evidence paths must use `/` so sort order matches rendered Markdown on all OS. */
function normRel(p) {
  return p.replace(/\\/g, '/');
}

export function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error: String(error?.message || error) };
  }
}

// Using utility function from @/fs-utils/recursive-directory-walker.js
// export function listStepDirs(sessionDir) {
//   try {
//     return fs
//       .readdirSync(sessionDir, { withFileTypes: true })
//       .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
//       .map((d) => Number(d.name))
//       .sort((a, b) => a - b);
//   } catch {
//     return [];
//   }
// }

export function checkChoiceShape(choice, idx) {
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

/**
 * @param {string} repoRoot - repository root (cwd for audit script)
 * @param {string} sessionId - e.g. sess_123
 */
export function analyzeSession(repoRoot, sessionId) {
  const sessionsRoot = path.join(repoRoot, 'a2a-client', 'storage', 'sessions');
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
      evidence.push(normRel(path.join('a2a-client', 'storage', 'sessions', sessionId, String(s))));
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
        evidence.push(
          normRel(path.join('a2a-client', 'storage', 'sessions', sessionId, String(stepNum), path.basename(f)))
        );
      }
      const choices = doc?.execute?.form?.choices;
      if (Array.isArray(choices)) {
        choices.forEach((c, i) => {
          const cIssues = checkChoiceShape(c, i);
          for (const ci of cIssues) {
            issues.push(`step ${stepNum}: ${ci}`);
            evidence.push(
              normRel(path.join('a2a-client', 'storage', 'sessions', sessionId, String(stepNum), path.basename(f)))
            );
          }
        });
      }
    }
  }

  return { sessionId, issues: Array.from(new Set(issues)).sort(), evidence: Array.from(new Set(evidence)).sort() };
}

export function classifyIssue(issue) {
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

export function buildClusters(allBad) {
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
