import fs from 'fs';
import path from 'path';
import { compareSessionCreatedAtDesc } from '@a2a/shared/session-sort.mjs';
import {
  isActivePromiseStatus,
  isRecoverableAsyncSnapshot,
} from './promise-status.js';
import { getStorageKvRoot } from './root.js';
import {
  deriveSessionMode,
  loadSessionIndex,
  reconcileSessionIndexFromDisk,
  saveSessionIndex,
} from './session-index-store.js';
import { loadNewStep, saveNewStep } from './session-step-io.js';
import {
  getNewSessionsDir,
  getNewSessionDir,
  getNewStepDir,
  listNewSteps,
  normalizeSessionIdForDir,
} from './session-paths.js';

function pruneUiStateForMissingSessions(existingSessionIds) {
  if (!existingSessionIds || typeof existingSessionIds.has !== 'function') return;
  const uiDir = path.join(getStorageKvRoot(), 'ui');
  if (!fs.existsSync(uiDir)) return;

  // 1) Delete per-window state files for non-existent sessions.
  // Current filename shape: window_state_sess_1234567890_1536x864_125.json
  const windowStateRe = /^window_state_(sess_\d+)_\d+x\d+_\d+\.json$/;
  for (const f of fs.readdirSync(uiDir)) {
    const m = f.match(windowStateRe);
    if (!m) continue;
    const sid = m[1];
    if (!existingSessionIds.has(sid)) {
      try {
        fs.unlinkSync(path.join(uiDir, f));
      } catch (e) {
        // Non-fatal: keep listing sessions even if one stale file cannot be removed.
        console.error('[ui-prune] Failed to delete UI window state', f, e?.message || e);
      }
    }
  }

  // 2) Prune UI window index (`a2a_session_windows.json`) so it doesn't reference removed sessions.
  const idxFile = path.join(uiDir, 'a2a_session_windows.json');
  if (!fs.existsSync(idxFile)) return;
  try {
    const raw = fs.readFileSync(idxFile, 'utf8');
    const wrapper = JSON.parse(raw);
    const valueRaw = wrapper?.value;
    if (typeof valueRaw !== 'string') return;
    const state = JSON.parse(valueRaw);
    const windows = Array.isArray(state?.windows) ? state.windows.filter((id) => existingSessionIds.has(String(id))) : [];
    const active = typeof state?.active === 'string' && existingSessionIds.has(state.active) ? state.active : (windows[0] || null);
    const next = { ...state, windows, active };
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    const out = { ...wrapper, value: JSON.stringify(next), timestamp: new Date().toISOString() };
    fs.writeFileSync(idxFile, JSON.stringify(out, null, 2));
  } catch (e) {
    console.error('[ui-prune] Failed to prune a2a_session_windows.json', e?.message || e);
  }
}

/**
 * Save session (legacy compatibility) - wraps step-based storage.
 * @param {string} cwd - Working directory
 * @param {Object} session - Session object with id, title, currentStep, context, etc.
 */
export function saveNewSession(cwd, session) {
  const sessionId = normalizeSessionIdForDir(session?.id);
  if (!sessionId) {
    console.error('[newSessions] saveNewSession: missing session.id');
    return;
  }
  const stepNum = session.currentStep || 1;

  if (session.context) {
    const stepDir = getNewStepDir(cwd, sessionId, stepNum);
    const metaFile = path.join(stepDir, 'server-response.json');
    if (!fs.existsSync(metaFile) && !session.promiseId) {
      const stepData = {
        step: stepNum,
        context: session.context,
        title: session.title,
        status: session.status || 'active',
        ...(session.execute !== undefined ? { execute: session.execute } : {}),
      };
      saveNewStep(cwd, sessionId, stepNum, stepData);
    }
  }

  saveSessionIndex(cwd, sessionId, {
    step: stepNum,
    context: session.context,
    title: session.title,
    status: session.status,
    promiseId: session.promiseId || null,
    promiseStatus: session.promiseStatus || null,
    ...(session.execute !== undefined && session.execute !== null
      ? { execute: session.execute }
      : {}),
  });
}

/**
 * Reconstruct session metadata from step files and save session-index.json.
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @returns {Object|null} Reconstructed session object or null if no steps found
 */
export function rebuildSessionIndex(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return null;
  const allSteps = listNewSteps(cwd, sid);
  if (allSteps.length === 0) return null;

  let latestStepNum = null;
  let latestStep = null;
  for (const stepNum of allSteps.reverse()) {
    const step = loadNewStep(cwd, sid, stepNum);
    if (step) {
      latestStepNum = stepNum;
      latestStep = step;
      break;
    }
  }

  if (latestStepNum == null || !latestStep) {
    return {
      id: sid,
      currentStep: allSteps[0] || 0,
      status: 'corrupt',
      title: `${sid} (corrupt)`,
      error: {
        code: 'SESSION_CORRUPT',
        message: 'No valid server-response.json found in any step.',
      },
    };
  }

  saveSessionIndex(cwd, sid, { step: latestStepNum, ...latestStep });

  return loadSessionIndex(cwd, sid);
}

/**
 * Step with server-promise.json but no server-response.json (LLM still running, or failed before snapshot).
 * Latest such step wins. Prevents projecting the previous step's form while step N has no terminal response.
 */
export function findOpenAsyncStepWithoutResponse(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return null;
  const steps = listNewSteps(cwd, sid).sort((a, b) => b - a);
  for (const stepNum of steps) {
    const stepDir = getNewStepDir(cwd, sid, stepNum);
    const respPath = path.join(stepDir, 'server-response.json');
    const promPath = path.join(stepDir, 'server-promise.json');
    if (!fs.existsSync(promPath)) continue;
    if (fs.existsSync(respPath)) continue;
    let prom = null;
    try {
      prom = JSON.parse(fs.readFileSync(promPath, 'utf8'));
    } catch (e) {
      console.error('[newSessions] Invalid server-promise.json (skipping step):', promPath, e?.message || e);
      continue;
    }
    if (!prom || typeof prom !== 'object') continue;
    if (isActivePromiseStatus(prom.status)) {
      return { stepNum, mode: 'pending', promise: prom };
    }
    if (prom.status === 'failed' || prom.status === 'error') {
      if (isRecoverableAsyncSnapshot(prom)) {
        return { stepNum, mode: 'pending', promise: prom };
      }
      return { stepNum, mode: 'failed', promise: prom };
    }
  }
  return null;
}

export function loadNewSession(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return null;
  let index = loadSessionIndex(cwd, sid);

  if (!index) {
    index = rebuildSessionIndex(cwd, sid);
  } else {
    reconcileSessionIndexFromDisk(cwd, sid);
    index = loadSessionIndex(cwd, sid);
  }

  if (!index) return null;
  if (index.status === 'corrupt') {
    const idFromIndex = normalizeSessionIdForDir(index.id);
    return { ...index, id: idFromIndex || sid };
  }

  let step = loadNewStep(cwd, sid, index.currentStep);
  const openAsync = findOpenAsyncStepWithoutResponse(cwd, sid);
  if (!step) {
    if (openAsync?.mode === 'pending' && openAsync.stepNum === index.currentStep && index.currentStep > 1) {
      step = loadNewStep(cwd, sid, index.currentStep - 1);
    }
    if (!step) {
      return rebuildSessionIndex(cwd, sid);
    }
  }

  const session = {
    id: sid,
    currentStep: index.currentStep,
    createdAt: index.createdAt || step.timestamp,
    updatedAt: index.updatedAt || step.timestamp,
    status: index.status || 'active',
    mode: index.mode || deriveSessionMode({ context: step.context }),
  };

  if (openAsync?.mode === 'pending') {
    session.asyncPending = true;
    session.promiseId = openAsync.promise?.promiseId ?? index.promiseId;
    session.promiseStatus = openAsync.promise?.status ?? index.promiseStatus;
    if (openAsync.promise?.context && typeof openAsync.promise.context === 'object') {
      session.context = openAsync.promise.context;
    } else if (step.context) {
      session.context = step.context;
    }
  } else if (openAsync?.mode === 'failed') {
    session.asyncPending = false;
    session.promiseId = openAsync.promise?.promiseId ?? null;
    session.promiseStatus = openAsync.promise?.status ?? 'failed';
    const err = openAsync.promise?.error;
    const msg =
      (err && typeof err.message === 'string' && err.message.trim()) ||
      'We couldn\'t complete this step. Please try again.';
    session.execute = { message: msg };
    if (openAsync.promise?.context && typeof openAsync.promise.context === 'object') {
      session.context = openAsync.promise.context;
    } else if (step.context) {
      session.context = step.context;
    }
  } else {
    if (step.execute) session.execute = step.execute;
    if (step.context) session.context = step.context;
    if (index.promiseId && index.promiseStatus && index.promiseStatus !== 'completed') {
      session.promiseId = index.promiseId;
      session.promiseStatus = index.promiseStatus;
      session.asyncPending = true;
    }
  }

  const step1 = index.currentStep === 1 ? step : loadNewStep(cwd, sid, 1);
  if (step1?.title) {
    session.title = step1.title;
  } else if (step1?.execute?.form?.input?.[0]?.label) {
    session.title = step1.execute.form.input[0].label;
  } else if (step1?.execute?.form?.choices) {
    session.title = 'Selection Session';
  } else {
    session.title = sid;
  }

  return session;
}

export function listNewSessions(cwd) {
  const sessionsDir = getNewSessionsDir(cwd);
  if (!fs.existsSync(sessionsDir)) return [];
  const entries = fs.readdirSync(sessionsDir, { withFileTypes: true })
    .filter(e => e.isDirectory());

  // Keep UI kv clean when sessions are deleted manually from disk.
  const ids = new Set(entries.map(e => normalizeSessionIdForDir(e.name)).filter(Boolean));
  pruneUiStateForMissingSessions(ids);

  return entries
    .map(e => {
      const session = loadNewSession(cwd, e.name);
      if (!session) return null;
      return { id: session.id, title: session.title || session.id, createdAt: session.createdAt };
    })
    .filter(Boolean)
    .sort(compareSessionCreatedAtDesc);
}

export function deleteNewSession(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return;
  const dir = getNewSessionDir(cwd, sid);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Remove step folders **after** `keepThroughStep` (numeric dirs &gt; keepThroughStep).
 * @returns {{ ok: true, keepThroughStep: number, removedSteps: number[] } | { ok: false, reason: string, maxStep?: number }}
 */
export function rewindSessionAfterStep(cwd, sessionId, keepThroughStep) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return { ok: false, reason: 'invalid_session_id' };
  const k = Number(keepThroughStep);
  if (!Number.isFinite(k) || k < 1) {
    return { ok: false, reason: 'invalid_keep_through_step' };
  }
  const steps = listNewSteps(cwd, sid);
  if (steps.length === 0) return { ok: false, reason: 'no_steps' };
  const max = steps[steps.length - 1];
  if (max <= k) {
    return { ok: false, reason: 'nothing_to_rewind_after_step', keepThroughStep: k, maxStep: max };
  }
  const removedSteps = [];
  for (const n of steps) {
    if (n <= k) continue;
    const stepDir = getNewStepDir(cwd, sid, n);
    if (!fs.existsSync(stepDir)) continue;
    try {
      fs.rmSync(stepDir, { recursive: true, force: true });
      removedSteps.push(n);
    } catch (e) {
      return { ok: false, reason: String(e?.message || e), partialRemoved: removedSteps };
    }
  }
  reconcileSessionIndexFromDisk(cwd, sid);
  return { ok: true, keepThroughStep: k, removedSteps };
}

/**
 * Delete the highest-numbered step folder.
 * @returns {{ ok: true, removedStep: number } | { ok: false, reason: string }}
 */
export function rewindSessionLastStep(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return { ok: false, reason: 'invalid_session_id' };
  const steps = listNewSteps(cwd, sid);
  if (steps.length === 0) return { ok: false, reason: 'no_steps' };
  const last = steps[steps.length - 1];
  if (last <= 1) {
    return { ok: false, reason: 'cannot_rewind_only_step_1' };
  }
  const r = rewindSessionAfterStep(cwd, sid, last - 1);
  if (!r.ok) return r;
  return { ok: true, removedStep: last };
}

/**
 * Highest numeric step directory (may include an in-flight folder with only server-promise.json).
 */
export function getNewSessionLatestStep(cwd, sessionId) {
  const steps = listNewSteps(cwd, sessionId);
  return steps.length > 0 ? steps[steps.length - 1] : 0;
}
