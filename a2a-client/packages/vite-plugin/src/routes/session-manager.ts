import fs from 'fs';
import pathMod from 'path';
import * as stepHandlers from './handlers/step-handlers.js';
import { loadSession, saveSession, resolveProjectPathForApi } from '@a2a/storage/src/projectSessions.ts';
import { registerStepSessionsParent } from '@a2a/storage/src/newSessions.ts';

export function validateSessionId(sessionId) {
    return stepHandlers.isValidSessionId(sessionId);
}

export function resolveProjectStorage({ cwd, sessionId, projectId, projectRoot, storageMode }) {
    if (storageMode !== 'project') return null;

    const projectPath = resolveProjectPathForApi(cwd, sessionId, { projectId, projectRoot });
    if (!projectPath) return null;

    const stepsParent = pathMod.join(projectPath, '.a2a', 'session-steps');
    fs.mkdirSync(stepsParent, { recursive: true });
    registerStepSessionsParent(sessionId, stepsParent);

    return { projectPath, stepsParent };
}

export function loadSessionData({ cwd, sessionId, projectPath }) {
    if (projectPath) {
        const session = loadSession(projectPath, sessionId);
        if (!session) {
            registerStepSessionsParent(sessionId, null);
        }
        return session;
    } else {
        return stepHandlers.loadNewSession(cwd, sessionId);
    }
}

export function saveSessionData({ projectPath, session }) {
    if (projectPath) {
        saveSession(projectPath, session);
    }
    stepHandlers.saveNewSession(null, session); // cwd is handled internally
}