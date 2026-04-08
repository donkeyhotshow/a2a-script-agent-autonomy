import fs from 'fs';
import path from 'path';
import { getNewStepDir, normalizeSessionIdForDir } from './session-paths.js';

/**
 * Read server-promise.json for a step (leaf helper — avoids circular imports with step-io).
 * @returns {object|null}
 */
export function readServerPromiseJson(cwd, sessionId, stepNum) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return null;
  const p = path.join(getNewStepDir(cwd, sid, stepNum), 'server-promise.json');
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return null;
  }
}
