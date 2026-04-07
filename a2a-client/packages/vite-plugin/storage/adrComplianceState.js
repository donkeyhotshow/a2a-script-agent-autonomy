import fs from 'fs';
import path from 'path';
import { normalizeProjectPath, projectPathsEqual } from './projectSessions.js';

/** Normative default per methodology/adr-compliance-orchestrator.md */
export const ADR_COMPLIANCE_STATE_RELATIVE = path.join('.a2a', 'adr-compliance-state.json');

export function getAdrComplianceStatePath(projectPath) {
  return path.join(normalizeProjectPath(projectPath), ADR_COMPLIANCE_STATE_RELATIVE);
}

/**
 * @param {string} projectPath - Resolved project root
 * @returns {object|null}
 */
export function loadAdrComplianceState(projectPath) {
  const file = getAdrComplianceStatePath(projectPath);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.error('[adrComplianceState] Failed to parse:', file, err?.message || err);
    throw err instanceof Error ? err : new Error(String(err));
  }
}

/**
 * @param {string} projectPath
 * @param {object} state
 */
export function saveAdrComplianceState(projectPath, state) {
  const abs = normalizeProjectPath(projectPath);
  const file = getAdrComplianceStatePath(abs);
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const payload = {
    ...state,
    projectRoot: typeof state.projectRoot === 'string' ? normalizeProjectPath(state.projectRoot) : abs,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
}

/**
 * Session context.projectRoot (from Client API) must match state file projectRoot for orchestrator step 1.
 * @param {{ projectRoot?: string }} sessionContext
 * @param {{ projectRoot?: string }} state
 */
export function sessionContextAlignsWithAdrState(sessionContext, state) {
  const cr =
    typeof sessionContext?.projectRoot === 'string'
      ? normalizeProjectPath(sessionContext.projectRoot)
      : '';
  const sr = typeof state?.projectRoot === 'string' ? normalizeProjectPath(state.projectRoot) : '';
  if (!cr || !sr) return false;
  return projectPathsEqual(cr, sr);
}
