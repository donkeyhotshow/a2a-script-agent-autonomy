import fs from 'fs';
import path from 'path';
import { ensureDir } from './root.js';
import {
  isActivePromiseStatus,
  isRemovablePromiseBesideResponse,
  isRecoverableAsyncSnapshot,
} from './promise-status.js';
import { loadSessionIndex, saveSessionIndex } from './session-index-store.js';
import {
  getNewSessionDir,
  getNewStepDir,
  getStepFilePath,
  listNewSteps,
  normalizeSessionIdForDir,
} from './session-paths.js';

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
  const { messages: _m, ...rest } = stepData;
  const metaFile = path.join(stepDir, 'server-response.json');
  const messagesFile = path.join(stepDir, 'messages.json');
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
  const { createdAt, startedAt, completedAt, checkedAt, ...filteredData } = promiseData;
  saveStepFile(cwd, sid, stepNum, 'server-promise.json', filteredData);

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

/**
 * Rebuild `submitResult` from a stored invoke body (matches `prepareServerRequest` output shape).
 * @param {Record<string, unknown>|null|undefined} body
 * @returns {Record<string, unknown>}
 */
export function inferSubmitResultFromRequestToServerPayload(body) {
  if (!body || typeof body !== 'object') {
    return { message: '' };
  }
  const r = body['result'];
  if (r !== undefined && r !== null) {
    if (typeof r === 'object' && !Array.isArray(r)) {
      return r;
    }
    if (typeof r === 'string') {
      return { message: r };
    }
  }
  const t = body['task'];
  if (typeof t === 'string' && t.trim()) {
    return { message: t.trim() };
  }
  return { message: '' };
}

/**
 * If `request-to-server.json` exists but `client-result.json` does not, write client-result from the request body.
 * @returns {{ fixed: boolean, reason?: string, dryRun?: boolean }}
 */
export function repairMissingClientResultForStep(cwd, sessionId, stepNum, opts = {}) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    return { fixed: false, reason: 'BAD_SESSION_ID' };
  }
  const stepDir = getNewStepDir(cwd, sid, stepNum);
  const reqPath = path.join(stepDir, 'request-to-server.json');
  const clientPath = path.join(stepDir, 'client-result.json');
  if (!fs.existsSync(reqPath)) {
    return { fixed: false, reason: 'NO_REQUEST' };
  }
  if (fs.existsSync(clientPath)) {
    return { fixed: false, reason: 'HAS_CLIENT' };
  }
  const body = loadRequestToServer(cwd, sid, stepNum);
  if (!body || typeof body !== 'object') {
    return { fixed: false, reason: 'BAD_REQUEST_JSON' };
  }
  const submit = inferSubmitResultFromRequestToServerPayload(body);
  if (opts.dryRun) {
    return { fixed: true, dryRun: true, reason: 'WOULD_WRITE' };
  }
  saveClientResult(cwd, sid, stepNum, { result: submit });
  return { fixed: true };
}

/**
 * Remove `server-promise.json` when the step never got `server-response.json` (abandoned async).
 * Clears session-index promise fields when they match this step as current.
 * @returns {{ dropped: boolean, reason?: string, dryRun?: boolean }}
 */
export function dropStaleServerPromiseForStep(cwd, sessionId, stepNum, opts = {}) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    return { dropped: false, reason: 'BAD_SESSION_ID' };
  }
  const stepDir = getNewStepDir(cwd, sid, stepNum);
  const pPath = path.join(stepDir, 'server-promise.json');
  const rPath = path.join(stepDir, 'server-response.json');
  if (!fs.existsSync(pPath)) {
    return { dropped: false, reason: 'NO_PROMISE' };
  }
  if (fs.existsSync(rPath)) {
    return { dropped: false, reason: 'HAS_RESPONSE' };
  }
  if (opts.dryRun) {
    return { dropped: true, dryRun: true };
  }
  try {
    fs.unlinkSync(pPath);
  } catch (e) {
    return { dropped: false, reason: String(e?.message || e) };
  }
  try {
    const idx = loadSessionIndex(cwd, sid);
    if (idx && Number(idx.currentStep) === Number(stepNum) && idx.promiseId != null) {
      idx.promiseId = null;
      idx.promiseStatus = null;
      idx.updatedAt = new Date().toISOString();
      const indexPath = path.join(getNewSessionDir(cwd, sid), 'session-index.json');
      fs.writeFileSync(indexPath, JSON.stringify(idx, null, 2));
    }
  } catch (eIdx) {
    console.error('[session-step-io] dropStaleServerPromiseForStep index patch failed:', eIdx?.message || eIdx);
  }
  return { dropped: true };
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

export function validateStepStorage(cwd, sessionId, stepNum) {
  const sid = normalizeSessionIdForDir(sessionId);
  if (!sid) {
    return { isValid: false, errors: ['MISSING_SESSION_ID'] };
  }
  const stepDir = getNewStepDir(cwd, sid, stepNum);
  const errors = [];

  const hasServerResponse = fs.existsSync(path.join(stepDir, 'server-response.json'));
  const hasServerPromise = fs.existsSync(path.join(stepDir, 'server-promise.json'));
  const hasClientResult = fs.existsSync(path.join(stepDir, 'client-result.json'));
  const hasRequestToServer = fs.existsSync(path.join(stepDir, 'request-to-server.json'));
  const hasMessages = fs.existsSync(path.join(stepDir, 'messages.json'));

  if (hasServerResponse && !hasMessages) {
    errors.push('FINALIZED_MISSING_MESSAGES: server-response.json exists but messages.json is missing');
  }

  if (hasServerResponse && hasServerPromise) {
    errors.push('STALE_PROMISE: server-response.json and server-promise.json should not coexist');
  }

  if (hasServerPromise && !hasClientResult && !hasRequestToServer && !hasServerResponse) {
    // valid in-flight
  }

  if (hasClientResult && !hasRequestToServer) {
    errors.push('INCOMPLETE_STEP: client-result.json exists but request-to-server.json is missing');
  }

  if (hasRequestToServer && !hasClientResult) {
    errors.push(
      'REQUEST_WITHOUT_CLIENT_RESULT: request-to-server.json exists but client-result.json is missing (orphan / interrupted /next)'
    );
  }

  if (hasServerPromise && !hasServerResponse && hasRequestToServer && hasClientResult) {
    errors.push(
      'STUCK_ASYNC_PROMISE: server-promise.json without server-response.json — invoke never finalized (poll dropped or process died)'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    files: {
      serverResponse: hasServerResponse,
      serverPromise: hasServerPromise,
      clientResult: hasClientResult,
      requestToServer: hasRequestToServer,
      messages: hasMessages,
    },
  };
}

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
    steps: results,
  };
}
