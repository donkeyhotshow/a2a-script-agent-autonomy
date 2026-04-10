import fs from 'fs';
import path from 'path';
import { ensureDir } from './root.js';
import { readServerPromiseJson } from './session-promise-read.js';
import {
   getNewSessionDir,
   getNewStepDir,
   listNewSteps,
   normalizeSessionIdForDir,
 } from '@a2a-client/storage/src/session-paths.mjs';

/**
 * Derive session mode from session data.
 * @param {Object} session - Session object with context
 * @returns {string} 'agent' | 'dialog' | 'task-decomposition'
 */
export function deriveSessionMode(session) {
  const ctx = session.context || {};

  const action = ctx.execution?.action;
  if (action === 'agent' || action === 'task-decomposition' || action === 'dialog') {
    return action;
  }

  if (ctx.workbench && Object.keys(ctx.workbench).length > 0) {
    return 'agent';
  }

  return 'dialog';
}

/**
 * Load session index (fast path) - lightweight metadata for quick session recovery.
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Index data or null if not found
 */
export function loadSessionIndex(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return null;
  const indexPath = path.join(getNewSessionDir(cwd, sid), 'session-index.json');
  if (!fs.existsSync(indexPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (e) {
    console.error('[newSessions] Corrupt or unreadable session-index.json:', indexPath, e?.message || e);
    return null;
  }
}

/**
 * Save session index - lightweight metadata for quick session recovery.
 * Called from saveNewStep() after each step is saved.
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @param {Object} stepData - Step data including context
 */
export function saveSessionIndex(cwd, sessionId, stepData) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    console.error('[newSessions] saveSessionIndex: missing sessionId');
    return;
  }
  const sessionDir = getNewSessionDir(cwd, sid);
  ensureDir(sessionDir);
  const indexPath = path.join(sessionDir, 'session-index.json');

  const index = loadSessionIndex(cwd, sid) || {
    sessionId: sid,
    steps: [],
  };

  const now = new Date().toISOString();
  index.updatedAt = now;
  if (!index.createdAt) {
    index.createdAt = now;
  }

  const incomingStep = stepData.step != null ? Number(stepData.step) : NaN;
  const prevCurrent = index.currentStep != null ? Number(index.currentStep) : 0;
  if (Number.isFinite(incomingStep) && incomingStep > 0) {
    index.currentStep = Math.max(prevCurrent || 0, incomingStep);
  } else if (!index.currentStep) {
    index.currentStep = 1;
  }

  index.mode = deriveSessionMode({ context: stepData.context || {} });

  const stepMeta = index.steps.find(s => s.step === stepData.step) || { step: stepData.step };
  const respPath = path.join(getNewStepDir(cwd, sid, stepData.step), 'server-response.json');
  stepMeta.hasServerResponse = fs.existsSync(respPath);
  if (!index.steps.find(s => s.step === stepData.step)) {
    index.steps.push(stepMeta);
  }

  const clientResultPath = path.join(getNewStepDir(cwd, sid, stepData.step), 'client-result.json');
  if (fs.existsSync(clientResultPath)) {
    stepMeta.hasClientResult = true;
  }

  if (stepData.promiseId) {
    index.promiseId = stepData.promiseId;
    index.promiseStatus = stepData.promiseStatus || 'pending';
  } else {
    const promiseData = readServerPromiseJson(cwd, sid, stepData.step);
    if (promiseData?.promiseId) {
      index.promiseId = promiseData.promiseId;
      index.promiseStatus = promiseData.status;
    } else if (!promiseData) {
      index.promiseId = null;
      index.promiseStatus = null;
    }
  }

  if (stepData.result || stepData.execute) {
    index.status = 'active';
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Re-align session-index.json with step folders (hasServerResponse, currentStep, promise fields).
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Updated index or null if no session dir / unreadable index
 */
export function reconcileSessionIndexFromDisk(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return null;
  const sessionDir = getNewSessionDir(cwd, sid);
  if (!fs.existsSync(sessionDir)) return null;
  const indexPath = path.join(sessionDir, 'session-index.json');
  if (!fs.existsSync(indexPath)) return null;
  let index;
  try {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (e) {
    console.error('[newSessions] reconcileSessionIndexFromDisk: corrupt index', indexPath, e?.message || e);
    return null;
  }

  const steps = listNewSteps(cwd, sid);
  let frontier = 0;
  for (const n of steps) {
    const stepDir = getNewStepDir(cwd, sid, n);
    const hasResp = fs.existsSync(path.join(stepDir, 'server-response.json'));
    const hasProm = fs.existsSync(path.join(stepDir, 'server-promise.json'));
    const hasClient = fs.existsSync(path.join(stepDir, 'client-result.json'));
    if (hasResp || hasProm || hasClient) {
      frontier = Math.max(frontier, n);
    }
  }

  if (!index.steps) index.steps = [];
  for (const n of steps) {
    const stepDir = getNewStepDir(cwd, sid, n);
    let sm = index.steps.find(s => s.step === n);
    if (!sm) {
      sm = { step: n };
      index.steps.push(sm);
    }
    sm.hasServerResponse = fs.existsSync(path.join(stepDir, 'server-response.json'));
    sm.hasClientResult = fs.existsSync(path.join(stepDir, 'client-result.json'));
  }

  if (frontier > 0) {
    index.currentStep = Math.max(index.currentStep || 0, frontier);
    const frontierDir = getNewStepDir(cwd, sid, frontier);
    const promPath = path.join(frontierDir, 'server-promise.json');
    const respPath = path.join(frontierDir, 'server-response.json');
    if (fs.existsSync(promPath) && !fs.existsSync(respPath)) {
      try {
        const prom = JSON.parse(fs.readFileSync(promPath, 'utf8'));
        if (prom && typeof prom === 'object' && typeof prom.promiseId === 'string') {
          index.promiseId = prom.promiseId;
          index.promiseStatus = prom.status || 'pending';
        }
      } catch (e) {
        console.error('[newSessions] reconcile: bad server-promise.json', promPath, e?.message || e);
      }
    } else if (fs.existsSync(respPath)) {
      index.promiseId = null;
      index.promiseStatus = null;
    }
  }

  index.updatedAt = new Date().toISOString();
  try {
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  } catch (e) {
    console.error('[newSessions] reconcileSessionIndexFromDisk: write failed', indexPath, e?.message || e);
    return null;
  }
  return index;
}
