import fs from 'fs';
import path from 'path';
import { compareSessionCreatedAtDesc } from '@a2a-client/shared/session-sort.mjs';
import { getStorageSessionsRoot, ensureDir } from './root.js';
import {
  isActivePromiseStatus,
  isRemovablePromiseBesideResponse,
  isRecoverableAsyncSnapshot,
} from './promise-status.js';

/** Normalize id for filesystem paths (session-index may store numeric id from legacy JSON). */
function normalizeSessionIdForDir(sessionId) {
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

/**
 * Derive session mode from session data.
 * @param {Object} session - Session object with context
 * @returns {string} 'agent' | 'dialog' | 'task-decomposition'
 */
export function deriveSessionMode(session) {
  const ctx = session.context || {};
  
  // 1. Explicit action flag from context.execution.action
  const action = ctx.execution?.action;
  if (action === 'agent' || action === 'task-decomposition' || action === 'dialog') {
    return action;
  }
  
  // 2. Workbench presence (agent mode only)
  if (ctx.workbench && Object.keys(ctx.workbench).length > 0) {
    return 'agent';
  }
  
  // 3. Default: dialog
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
    steps: []
  };
  
  // Update timestamps
  const now = new Date().toISOString();
  index.updatedAt = now;
  if (!index.createdAt) {
    index.createdAt = now;
  }
  
  // Update current step
  index.currentStep = stepData.step || index.currentStep || 1;
  
  index.mode = deriveSessionMode({ context: stepData.context || {} });
  
  // Update step metadata
  const stepMeta = index.steps.find(s => s.step === stepData.step) || { step: stepData.step };
  stepMeta.hasServerResponse = true;
  if (!index.steps.find(s => s.step === stepData.step)) {
    index.steps.push(stepMeta);
  }
  
  // Try to load client-result for this step
  const clientResultPath = path.join(getNewStepDir(cwd, sid, stepData.step), 'client-result.json');
  if (fs.existsSync(clientResultPath)) {
    stepMeta.hasClientResult = true;
  }
  
  // Check for pending async state
  // Priority: use stepData.promiseId if provided, otherwise try loadServerPromise
  if (stepData.promiseId) {
    index.promiseId = stepData.promiseId;
    index.promiseStatus = stepData.promiseStatus || 'pending';
  } else {
    const promiseData = loadServerPromise(cwd, sid, stepData.step);
    if (promiseData?.promiseId) {
      index.promiseId = promiseData.promiseId;
      index.promiseStatus = promiseData.status;
    } else if (!promiseData) {
      // Clear async state if no pending promise
      index.promiseId = null;
      index.promiseStatus = null;
    }
  }
  
  // Determine status from latest step
  if (stepData.result || stepData.execute) {
    index.status = 'active';
  }
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

/**
 * Save session (legacy compatibility) - wraps step-based storage.
 * @param {string} cwd - Working directory
 * @param {Object} session - Session object with id, title, currentStep, context, etc.
 */
export function saveNewSession(cwd, session) {
  // Save session using step-based storage (modern approach)
  // The session object contains id, title, currentStep, context, etc.
  const sessionId = normalizeSessionIdForDir(session?.id);
  if (!sessionId) {
    console.error('[newSessions] saveNewSession: missing session.id');
    return;
  }
  const stepNum = session.currentStep || 1;

  // Persist step-level snapshot only if the step file doesn't already exist.
  // Async completion writes server-response.json (including execute), and calling saveNewSession()
  // right after was clobbering that file by re-writing only { context, title, status }.
  if (session.context) {
    const stepDir = getNewStepDir(cwd, sessionId, stepNum);
    const metaFile = path.join(stepDir, 'server-response.json');
    // Do not write a stub while async is pending — dialog-flow already saved server-promise.json;
    // a stub here hides the real invoke result until poll completes (and may never be overwritten).
    if (!fs.existsSync(metaFile) && !session.promiseId) {
      const stepData = {
        step: stepNum,
        context: session.context,
        title: session.title,
        status: session.status || 'active',
        ...(session.execute !== undefined ? { execute: session.execute } : {})
      };
      saveNewStep(cwd, sessionId, stepNum, stepData);
    }
  }
  
  // Always update session index for fast recovery
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

export function getNewSessionsDir(cwd) {
  return getStorageSessionsRoot();
}

export function getNewSessionDir(cwd, sessionId) {
  let sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    console.error('[newSessions] getNewSessionDir: missing sessionId (using fallback dir)');
    // Never throw: bad callers / hot-reload edge cases must not 500 the Client API.
    sid = '_invalid_session';
  }
  const parent = stepSessionsParentBySessionId.get(sid);
  // Treat empty string like missing — path.join(undefined|'', id) throws or mis-resolves.
  const base = parent && String(parent).trim() ? parent : getNewSessionsDir(cwd);
  return path.join(base, sid);
}

export function getNewStepDir(cwd, sessionId, stepNum) {
  return path.join(getNewSessionDir(cwd, sessionId), String(stepNum));
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

  // Save index for future fast loads
  saveSessionIndex(cwd, sid, { step: latestStepNum, ...latestStep });
  
  // Return loaded index
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
  // Try fast path (index)
  let index = loadSessionIndex(cwd, sid);
  
  // Rebuild if missing
  if (!index) {
    index = rebuildSessionIndex(cwd, sid);
  }
  
  if (!index) return null;
  if (index.status === 'corrupt') {
    // session-index.json may omit `id`; saveNewSession/getNewStepDir require it.
    const idFromIndex = normalizeSessionIdForDir(index.id);
    return { ...index, id: idFromIndex || sid };
  }

  const step = loadNewStep(cwd, sid, index.currentStep);
  if (!step) return rebuildSessionIndex(cwd, sid); // Retry rebuild if indexed step is gone

  // Reconstruct session from index + latest step
  const session = {
    id: sid,
    currentStep: index.currentStep,
    createdAt: index.createdAt || step.timestamp,
    updatedAt: index.updatedAt || step.timestamp,
    status: index.status || 'active',
    mode: index.mode || deriveSessionMode({ context: step.context })
  };

  const openAsync = findOpenAsyncStepWithoutResponse(cwd, sid);

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

  // Title resolution
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

/**
 * @deprecated Since 2026-03-27 - Use step-based storage instead. Will be removed in next release cycle.
 * @see docs/new-request-flow/PROTOCOL.md#session-storage
 */

export function saveNewStep(cwd, sessionId, stepNum, stepData) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    console.error('[newSessions] saveNewStep: missing sessionId');
    return;
  }
  const stepDir = getNewStepDir(cwd, sid, stepNum);
  ensureDir(stepDir);
  if (stepData.files) {
    Object.entries(stepData.files).forEach(([filename, content]) => {
      const resolvedPath = path.resolve(stepDir, filename);
      if (path.relative(stepDir, resolvedPath).startsWith('..')) {
        throw new Error(`Path traversal attempt: ${filename}`);
      }
      fs.writeFileSync(resolvedPath, content);
    });
  }
  const messages = Array.isArray(stepData.messages) ? stepData.messages : [];
  const {messages: _m, ...rest} = stepData;
  const metaFile = path.join(stepDir, 'server-response.json');
  const messagesFile = path.join(stepDir, 'messages.json');
  // Protocol snapshot matches simulations (response.json): no `messages` in server-response.json
  fs.writeFileSync(metaFile, JSON.stringify(rest, null, 2));
  fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
  const promiseFile = path.join(stepDir, 'server-promise.json');
  if (fs.existsSync(promiseFile)) {
    try {
      fs.unlinkSync(promiseFile);
    } catch (e) {
      console.error('[newSessions] Failed to remove server-promise.json after response:', e.message);
    }
  }
  
  // Update session index for fast recovery (P1)
  saveSessionIndex(cwd, sid, { step: stepNum, ...rest });
}

export function loadNewStep(cwd, sessionId, stepNum) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return null;
  const stepDir = getNewStepDir(cwd, sid, stepNum);
  const metaFile = path.join(stepDir, 'server-response.json');
  const legacyFile = path.join(stepDir, 'step.json');
  const file = fs.existsSync(metaFile) ? metaFile : (fs.existsSync(legacyFile) ? legacyFile : null);
  if (!file) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.messages === undefined) {
      const messagesFile = path.join(stepDir, 'messages.json');
      if (fs.existsSync(messagesFile)) {
        try {
          data.messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
        } catch (e) {
          console.error('[newSessions] Failed to parse messages.json:', e.message);
        }
      }
    }
    const promiseFile = path.join(stepDir, 'server-promise.json');
    if (fs.existsSync(promiseFile)) {
      try {
        let prom = null;
        try {
          prom = JSON.parse(fs.readFileSync(promiseFile, 'utf8'));
        } catch (e) {
          console.error('[newSessions] Could not parse server-promise.json:', promiseFile, e?.message || e);
          prom = null;
        }
        const hasTerminalExecute = data.execute != null && typeof data.execute === 'object';
        // server-response + stale server-promise (e.g. { status: 'pending' } without promiseId) leaves
        // getActiveAsyncWork stuck on session-index; /async polls forever and the web UI hides the form.
        if (hasTerminalExecute && (prom == null || typeof prom !== 'object' || isActivePromiseStatus(prom.status))) {
          fs.unlinkSync(promiseFile);
          try {
            const idx = loadSessionIndex(cwd, sid);
            if (idx && idx.currentStep === stepNum && (idx.promiseId != null || idx.promiseStatus != null)) {
              idx.promiseId = null;
              idx.promiseStatus = null;
              idx.updatedAt = new Date().toISOString();
              const indexPath = path.join(getNewSessionDir(cwd, sid), 'session-index.json');
              fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2));
            }
          } catch (eIdx) {
            console.error('[newSessions] Failed to clear stale index promise:', eIdx.message);
          }
        } else if (isRemovablePromiseBesideResponse(prom)) {
          fs.unlinkSync(promiseFile);
        }
      } catch (e) {
        try {
          fs.unlinkSync(promiseFile);
        } catch (e2) {
          console.error('[newSessions] Failed to remove server-promise.json:', e2.message);
        }
      }
    }
    return data;
  } catch (e) {
    console.error('[newSessions] Failed to parse step file:', e.message);
    return null;
  }
}

export function listNewSteps(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return [];
  const sessionDir = getNewSessionDir(cwd, sid);
  if (!fs.existsSync(sessionDir)) return [];
  const entries = fs.readdirSync(sessionDir, {withFileTypes: true});
  return entries
    .filter(e => e.isDirectory() && /^\d+$/.test(e.name))
    .map(e => parseInt(e.name, 10))
    .sort((a, b) => a - b);
}

export function listNewSessions(cwd) {
  const sessionsDir = getNewSessionsDir(cwd);
  if (!fs.existsSync(sessionsDir)) return [];
  return fs.readdirSync(sessionsDir, {withFileTypes: true})
    .filter(e => e.isDirectory())
    .map(e => {
      const session = loadNewSession(cwd, e.name);
      if (!session) return null;
      return {id: session.id, title: session.title || session.id, createdAt: session.createdAt};
    })
    .filter(Boolean)
    .sort(compareSessionCreatedAtDesc);
}

export function deleteNewSession(cwd, sessionId) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return;
  const dir = getNewSessionDir(cwd, sid);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

/**
 * Highest numeric step directory (may include an in-flight folder with only server-promise.json).
 * For the last completed step (server-response.json), use loadNewSession().currentStep instead.
 */
export function getNewSessionLatestStep(cwd, sessionId) {
  const steps = listNewSteps(cwd, sessionId);
  return steps.length > 0 ? steps[steps.length - 1] : 0;
}

export function getStepFilePath(cwd, sessionId, stepNum, filename) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) return '';
  return path.join(getNewStepDir(cwd, sid, stepNum), filename);
}

export function loadStepFile(cwd, sessionId, stepNum, filename) {
  const filePath = getStepFilePath(cwd, sessionId, stepNum, filename);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('[newSessions] Failed to parse step file', filename, ':', e.message);
    return {
      error: {
        code: 'STEP_FILE_PARSE_ERROR',
        file: filename,
        message: e.message,
      },
    };
  }
}

export function saveStepFile(cwd, sessionId, stepNum, filename, data) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    console.error('[newSessions] saveStepFile: missing sessionId');
    return;
  }
  const stepDir = getNewStepDir(cwd, sid, stepNum);
  ensureDir(stepDir);
  const filePath = path.join(stepDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadServerPromise(cwd, sessionId, stepNum) {
  return loadStepFile(cwd, sessionId, stepNum, 'server-promise.json');
}

export function saveServerPromise(cwd, sessionId, stepNum, promiseData) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    console.error('[newSessions] saveServerPromise: missing sessionId');
    return;
  }
  // Filter out unnecessary fields from promise data
  const { createdAt, startedAt, completedAt, checkedAt, ...filteredData } = promiseData;
  saveStepFile(cwd, sid, stepNum, 'server-promise.json', filteredData);
  
  // Update session index with async state (P1)
  const index = loadSessionIndex(cwd, sid);
  if (index && filteredData.promiseId) {
    index.promiseId = filteredData.promiseId;
    index.promiseStatus = filteredData.status;
    index.updatedAt = new Date().toISOString();
    const indexPath = path.join(getNewSessionDir(cwd, sid), 'session-index.json');
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }
}

export function loadClientResult(cwd, sessionId, stepNum) {
  return loadStepFile(cwd, sessionId, stepNum, 'client-result.json');
}

export function saveClientResult(cwd, sessionId, stepNum, resultData) {
  return saveStepFile(cwd, sessionId, stepNum, 'client-result.json', resultData);
}

export function loadRequestToServer(cwd, sessionId, stepNum) {
  return loadStepFile(cwd, sessionId, stepNum, 'request-to-server.json');
}

export function saveRequestToServer(cwd, sessionId, stepNum, requestData) {
  return saveStepFile(cwd, sessionId, stepNum, 'request-to-server.json', requestData);
}

export function loadServerResponse(cwd, sessionId, stepNum) {
  return loadNewStep(cwd, sessionId, stepNum);
}

export function saveServerResponse(cwd, sessionId, stepNum, responseData) {
  return saveNewStep(cwd, sessionId, stepNum, responseData);
}

/**
 * Validate step storage integrity.
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @param {number} stepNum - Step number
 * @returns {Object} Validation result with isValid and errors array
 */
export function validateStepStorage(cwd, sessionId, stepNum) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    return { isValid: false, errors: ['MISSING_SESSION_ID'] };
  }
  const stepDir = getNewStepDir(cwd, sid, stepNum);
  const errors = [];
  
  // Check for mandatory files (at least one must exist)
  const hasServerResponse = fs.existsSync(path.join(stepDir, 'server-response.json'));
  const hasServerPromise = fs.existsSync(path.join(stepDir, 'server-promise.json'));
  const hasClientResult = fs.existsSync(path.join(stepDir, 'client-result.json'));
  const hasRequestToServer = fs.existsSync(path.join(stepDir, 'request-to-server.json'));
  const hasMessages = fs.existsSync(path.join(stepDir, 'messages.json'));
  
  // Rule 1: Finalized step must have server-response.json + messages.json
  if (hasServerResponse && !hasMessages) {
    errors.push('FINALIZED_MISSING_MESSAGES: server-response.json exists but messages.json is missing');
  }
  
  // Rule 2: Async completed step must NOT have stale server-promise.json
  if (hasServerResponse && hasServerPromise) {
    errors.push('STALE_PROMISE: server-response.json and server-promise.json should not coexist');
  }
  
  // Rule 3: If only server-promise.json exists (no client-result, no request-to-server), it's valid in-flight
  if (hasServerPromise && !hasClientResult && !hasRequestToServer && !hasServerResponse) {
    // This is valid - step is waiting for async, client result was in previous step
  }
  
  // Rule 4: If has client-result but no request-to-server, it's incomplete
  if (hasClientResult && !hasRequestToServer) {
    errors.push('INCOMPLETE_STEP: client-result.json exists but request-to-server.json is missing');
  }
  
  // Rule 5: If has request-to-server but no client-result, may be server-initiated (valid for some flows)
  // Allow this as server-initiated steps don't require client input
  
  return {
    isValid: errors.length === 0,
    errors,
    files: {
      serverResponse: hasServerResponse,
      serverPromise: hasServerPromise,
      clientResult: hasClientResult,
      requestToServer: hasRequestToServer,
      messages: hasMessages
    }
  };
}

/**
 * Validate entire session storage integrity.
 * @param {string} cwd - Working directory
 * @param {string} sessionId - Session ID
 * @returns {Object} Validation result with step results
 */
export function validateSessionStorage(cwd, sessionId) {
  const steps = listNewSteps(cwd, sessionId);
  const results = [];
  
  for (const stepNum of steps) {
    const result = validateStepStorage(cwd, sessionId, stepNum);
    results.push({ step: stepNum, ...result });
  }
  
  const allValid = results.every(r => r.isValid);
  return {
    sessionId,
    isValid: allValid,
    stepCount: steps.length,
    steps: results
  };
}
