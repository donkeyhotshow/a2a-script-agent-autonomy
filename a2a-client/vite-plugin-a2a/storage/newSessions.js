import fs from 'fs';
import path from 'path';
import { getStorageRoot, ensureDir } from './root.js';

export function getNewSessionsDir(cwd) {
  return path.join(getStorageRoot(), 'sessions');
}

export function getNewSessionDir(cwd, sessionId) {
  return path.join(getNewSessionsDir(cwd), sessionId);
}

export function getNewSessionMetaFile(cwd, sessionId) {
  // DEPRECATED: Removed - session.json is no longer used
  return null;
}

export function getNewStepDir(cwd, sessionId, stepNum) {
  return path.join(getNewSessionDir(cwd, sessionId), String(stepNum));
}

export function loadNewSession(cwd, sessionId) {
  // Reconstruct session from step files
  // Session is defined by the highest step number with server-response.json
  const steps = listNewSteps(cwd, sessionId);
  if (steps.length === 0) return null;
  
  // Get the latest step with server-response.json
  const latestStepNum = steps[steps.length - 1];
  const latestStep = loadNewStep(cwd, sessionId, latestStepNum);
  if (!latestStep) return null;
  
  // Reconstruct session metadata from step data
  const session = {
    id: sessionId,
    currentStep: latestStepNum,
    createdAt: latestStep.timestamp,
    updatedAt: latestStep.timestamp,
    status: 'active'
  };
  
  // Add execute, context, result from latest step
  if (latestStep.execute) session.execute = latestStep.execute;
  if (latestStep.context) session.context = latestStep.context;
  if (latestStep.result) session.result = latestStep.result;
  
  // Get title from step 1 if available
  const step1 = loadNewStep(cwd, sessionId, 1);
  if (step1?.execute?.form?.input?.label) {
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
  const messages = stepData.messages || [];
  const stepText = messages.map((m) => (typeof m === 'string' ? m : m?.content || '')).filter(Boolean).join('\n');
  const {messages: _m, ...rest} = stepData;
  const metaFile = path.join(stepDir, 'server-response.json');
  fs.writeFileSync(metaFile, JSON.stringify({
    step: stepNum,
    timestamp: new Date().toISOString(),
    stepText: stepText || undefined,
    ...rest
  }, null, 2));
  const messagesFile = path.join(stepDir, 'messages.json');
  fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
}

export function loadNewStep(cwd, sessionId, stepNum) {
  const stepDir = getNewStepDir(cwd, sessionId, stepNum);
  const metaFile = path.join(stepDir, 'server-response.json');
  const legacyFile = path.join(stepDir, 'step.json');
  const file = fs.existsSync(metaFile) ? metaFile : (fs.existsSync(legacyFile) ? legacyFile : null);
  if (!file) return null;
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const messagesFile = path.join(stepDir, 'messages.json');
    if (fs.existsSync(messagesFile)) {
      try {
        data.messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
      } catch {
        // Keep existing messages if parsing failed
      }
    }
    return data;
  } catch {
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
  } catch {
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
  return saveStepFile(cwd, sessionId, stepNum, 'server-promise.json', promiseData);
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
