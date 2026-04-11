import path from 'path';
import { getNewStepDir, normalizeSessionIdForDir } from '@a2a-client/storage/src/session-paths.mjs';
import { readJsonFileSync } from './utils.ts';

/**
 * Read server-promise.json for a step (leaf helper — avoids circular imports with step-io).
 * @returns {object|null}
 */
export function readServerPromiseJson(cwd, sessionId, stepNum) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return null;
  const p = path.join(getNewStepDir(cwd, sid, stepNum), 'server-promise.json');
  return readJsonFileSync(p);
}
