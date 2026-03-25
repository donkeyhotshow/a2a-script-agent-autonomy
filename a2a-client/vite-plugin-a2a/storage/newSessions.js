import fs from 'fs';
import path from 'path';
import { getStorageRoot, ensureDir } from './root.js';
import { isRemovablePromiseBesideResponse } from './promise-status.js';

export function getNewSessionsDir(cwd) {
  return path.join(getStorageRoot(), 'sessions');
}

export function getNewSessionDir(cwd, sessionId) {
  return path.join(getNewSessionsDir(cwd), sessionId);
}

export function getNewStepDir(cwd, sessionId, stepNum) {
  return path.join(getNewSessionDir(cwd, sessionId), String(stepNum));
}

export function loadNewSession(cwd, sessionId) {
  // Reconstruct session from step files
  // Session is defined by the highest step number WITH server-response.json (not just the highest step number)
  const allSteps = listNewSteps(cwd, sessionId);
  if (allSteps.length === 0) return null;

  let latestStepNum = null;
  let latestStep = null;
  for (const stepNum of allSteps) {
    const step = loadNewStep(cwd, sessionId, stepNum);
    if (step) {
      latestStepNum = stepNum;
      latestStep = step;
    }
  }
  if (latestStepNum == null || !latestStep) return null;

  // Reconstruct session metadata from step data
  const session = {
    id: sessionId,
    currentStep: latestStepNum,
    createdAt: latestStep.timestamp,
    updatedAt: latestStep.timestamp,
    status: 'active'
  };

  // Add execute, context from latest step (result is not needed - stored in client-result.json)
  if (latestStep.execute) session.execute = latestStep.execute;
  if (latestStep.context) session.context = latestStep.context;

  // Get title from step 1 if available (reuse latest when current step is 1 — avoids a second parse)
  const step1 = latestStepNum === 1 ? latestStep : loadNewStep(cwd, sessionId, 1);
  if (step1?.title) {
    session.title = step1.title;
  } else if (step1?.execute?.form?.input?.label) {
    session.title = step1.execute.form.input.label;
  } else if (step1?.execute?.form?.choices) {
    session.title = 'Selection Session';
  } else {
    session.title = sessionId;
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
  const payload = {
    ...rest,
    messages,
  };
  // Note: step number is derived from folder path, not stored in JSON
  fs.writeFileSync(metaFile, JSON.stringify(payload, null, 2));
  const promiseFile = path.join(stepDir, 'server-promise.json');
  if (fs.existsSync(promiseFile)) {
    try {
      fs.unlinkSync(promiseFile);
    } catch (e) {
      console.error('[newSessions] Failed to remove server-promise.json after response:', e.message);
    }
  }
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
    return null;
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
  return saveStepFile(cwd, sessionId, stepNum, 'server-promise.json', filteredData);
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
