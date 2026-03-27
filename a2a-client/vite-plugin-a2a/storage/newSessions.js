import fs from 'fs';
import path from 'path';
import { getStorageRoot, ensureDir } from './root.js';
import { isRemovablePromiseBesideResponse } from './promise-status.js';

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
  const indexPath = path.join(getNewSessionDir(cwd, sessionId), 'session-index.json');
  if (!fs.existsSync(indexPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch {
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
  const sessionDir = getNewSessionDir(cwd, sessionId);
  const indexPath = path.join(sessionDir, 'session-index.json');
  
  const index = loadSessionIndex(cwd, sessionId) || {
    sessionId,
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
  
  // Derive mode from context
  const ctx = stepData.context || {};
  const action = ctx.execution?.action;
  if (action === 'agent' || action === 'task-decomposition' || action === 'dialog') {
    index.mode = action;
  } else if (ctx.workbench && Object.keys(ctx.workbench).length > 0) {
    index.mode = 'agent';
  }
  
  // Update step metadata
  const stepMeta = index.steps.find(s => s.step === stepData.step) || { step: stepData.step };
  stepMeta.hasServerResponse = true;
  if (!index.steps.find(s => s.step === stepData.step)) {
    index.steps.push(stepMeta);
  }
  
  // Try to load client-result for this step
  const clientResultPath = path.join(getNewStepDir(cwd, sessionId, stepData.step), 'client-result.json');
  if (fs.existsSync(clientResultPath)) {
    stepMeta.hasClientResult = true;
  }
  
  // Check for pending async state
  const promiseData = loadServerPromise(cwd, sessionId, stepData.step);
  if (promiseData?.promiseId) {
    index.promiseId = promiseData.promiseId;
    index.promiseStatus = promiseData.status;
  } else if (!promiseData) {
    // Clear async state if no pending promise
    index.promiseId = null;
    index.promiseStatus = null;
  }
  
  // Determine status from latest step
  if (stepData.result || stepData.execute) {
    index.status = 'active';
  }
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

export function getNewSessionsDir(cwd) {
  return path.join(getStorageRoot(), 'sessions');
}

export function getNewSessionDir(cwd, sessionId) {
  return path.join(getNewSessionsDir(cwd), sessionId);
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
  const allSteps = listNewSteps(cwd, sessionId);
  if (allSteps.length === 0) return null;

  let latestStepNum = null;
  let latestStep = null;
  for (const stepNum of allSteps.reverse()) {
    const step = loadNewStep(cwd, sessionId, stepNum);
    if (step) {
      latestStepNum = stepNum;
      latestStep = step;
      break;
    }
  }

  if (latestStepNum == null || !latestStep) {
    return {
      id: sessionId,
      currentStep: allSteps[0] || 0,
      status: 'corrupt',
      title: `${sessionId} (corrupt)`,
      error: {
        code: 'SESSION_CORRUPT',
        message: 'No valid server-response.json found in any step.',
      },
    };
  }

  // Save index for future fast loads
  saveSessionIndex(cwd, sessionId, { step: latestStepNum, ...latestStep });
  
  // Return loaded index
  return loadSessionIndex(cwd, sessionId);
}

export function loadNewSession(cwd, sessionId) {
  // Try fast path (index)
  let index = loadSessionIndex(cwd, sessionId);
  
  // Rebuild if missing
  if (!index) {
    index = rebuildSessionIndex(cwd, sessionId);
  }
  
  if (!index) return null;
  if (index.status === 'corrupt') return index;

  const step = loadNewStep(cwd, sessionId, index.currentStep);
  if (!step) return rebuildSessionIndex(cwd, sessionId); // Retry rebuild if indexed step is gone

  // Reconstruct session from index + latest step
  const session = {
    id: sessionId,
    currentStep: index.currentStep,
    createdAt: index.createdAt || step.timestamp,
    updatedAt: index.updatedAt || step.timestamp,
    status: index.status || 'active',
    mode: index.mode || deriveSessionMode({ context: step.context })
  };
  
  if (step.execute) session.execute = step.execute;
  if (step.context) session.context = step.context;
  
  // Title resolution
  const step1 = index.currentStep === 1 ? step : loadNewStep(cwd, sessionId, 1);
  if (step1?.title) {
    session.title = step1.title;
  } else if (step1?.execute?.form?.input?.[0]?.label) {
    session.title = step1.execute.form.input[0].label;
  } else if (step1?.execute?.form?.choices) {
    session.title = 'Selection Session';
  } else {
    session.title = sessionId;
  }
  
  // Async status
  if (index.promiseId && index.promiseStatus && index.promiseStatus !== 'completed') {
    session.promiseId = index.promiseId;
    session.promiseStatus = index.promiseStatus;
    session.asyncPending = true;
  }
  
  return session;
}

export function saveNewSession(cwd, session) {
  // DEPRECATED: session.json is no longer written
  // All session state is now derived from step files
  // This function is kept for backward compatibility but does nothing
  // Session is reconstructed from: server-response.json + messages.json files
  const dir = getNewSessionDir(cwd, session.id);
  ensureDir(dir);
  // NOOP: We no longer write session.json
  // The session is reconstructed from the highest step with server-response.json
}

export function saveNewStep(cwd, sessionId, stepNum, stepData) {
  const stepDir = getNewStepDir(cwd, sessionId, stepNum);
  ensureDir(stepDir);
  if (stepData.files) {
    Object.entries(stepData.files).forEach(([filename, content]) => {
      fs.writeFileSync(path.join(stepDir, filename), content);
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
  saveSessionIndex(cwd, sessionId, { step: stepNum, ...rest });
}

export function loadNewStep(cwd, sessionId, stepNum) {
  const stepDir = getNewStepDir(cwd, sessionId, stepNum);
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
        const prom = JSON.parse(fs.readFileSync(promiseFile, 'utf8'));
        if (isRemovablePromiseBesideResponse(prom)) {
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
  const sessionDir = getNewSessionDir(cwd, sessionId);
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
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export function deleteNewSession(cwd, sessionId) {
  const dir = getNewSessionDir(cwd, sessionId);
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
  return path.join(getNewStepDir(cwd, sessionId, stepNum), filename);
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
  const stepDir = getNewStepDir(cwd, sessionId, stepNum);
  ensureDir(stepDir);
  const filePath = path.join(stepDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadServerPromise(cwd, sessionId, stepNum) {
  return loadStepFile(cwd, sessionId, stepNum, 'server-promise.json');
}

export function saveServerPromise(cwd, sessionId, stepNum, promiseData) {
  // Filter out unnecessary fields from promise data
  const { createdAt, startedAt, completedAt, checkedAt, ...filteredData } = promiseData;
  saveStepFile(cwd, sessionId, stepNum, 'server-promise.json', filteredData);
  
  // Update session index with async state (P1)
  const index = loadSessionIndex(cwd, sessionId);
  if (index && filteredData.promiseId) {
    index.promiseId = filteredData.promiseId;
    index.promiseStatus = filteredData.status;
    index.updatedAt = new Date().toISOString();
    const indexPath = path.join(getNewSessionDir(cwd, sessionId), 'session-index.json');
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
