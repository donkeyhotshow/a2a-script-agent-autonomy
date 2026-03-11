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
  return path.join(getNewSessionDir(cwd, sessionId), 'session.json');
}

export function getNewStepDir(cwd, sessionId, stepNum) {
  return path.join(getNewSessionDir(cwd, sessionId), String(stepNum));
}

export function loadNewSession(cwd, sessionId) {
  const metaFile = getNewSessionMetaFile(cwd, sessionId);
  if (!fs.existsSync(metaFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  } catch {
    return null;
  }
}

export function saveNewSession(cwd, session) {
  const dir = getNewSessionDir(cwd, session.id);
  ensureDir(dir);
  const metaFile = path.join(dir, 'session.json');
  fs.writeFileSync(metaFile, JSON.stringify(session, null, 2));
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
