import fs from 'fs';
import path from 'path';
import { getStorageSessionsRoot } from './root.js';

/** Normalize id for filesystem paths (session-index may store numeric id from legacy JSON). */
export function normalizeSessionIdForDir(sessionId) {
  if (sessionId == null) return '';
  const s = typeof sessionId === 'string' ? sessionId : String(sessionId);
  return s.trim();
}

/** When set, step files for this session live under `${parent}/${sessionId}/…` (project storage mode). */
const stepSessionsParentBySessionId = new Map();

export function registerStepSessionsParent(sessionId, absoluteParentDirOrNull) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return;
  if (absoluteParentDirOrNull == null) stepSessionsParentBySessionId.delete(sid);
  else stepSessionsParentBySessionId.set(sid, path.resolve(absoluteParentDirOrNull));
}

/** Test / recovery: in-process Map must not leak across Vitest files. */
export function clearStepSessionsParentRegistry() {
  stepSessionsParentBySessionId.clear();
}

export function getNewSessionsDir(cwd) {
  return getStorageSessionsRoot();
}

export function getNewSessionDir(cwd, sessionId) {
  let sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    console.error('[newSessions] getNewSessionDir: missing sessionId (using fallback dir)');
    sid = '_invalid_session';
  }
  const parent = stepSessionsParentBySessionId.get(sid);
  const base = parent && String(parent).trim() ? parent : getNewSessionsDir(cwd);
  return path.join(base, sid);
}

export function getNewStepDir(cwd, sessionId, stepNum) {
  return path.join(getNewSessionDir(cwd, sessionId), String(stepNum));
}

export function getStepFilePath(cwd, sessionId, stepNum, filename) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return '';
  return path.join(getNewStepDir(cwd, sid, stepNum), filename);
}

export function listNewSteps(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return [];
  const sessionDir = getNewSessionDir(cwd, sid);
  if (!fs.existsSync(sessionDir)) return [];
  const entries = fs.readdirSync(sessionDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
    .map(e => parseInt(e.name, 10))
    .sort((a, b) => a - b);
}
