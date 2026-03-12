/**
 * Step utils - FS operations for steps
 */

import fs from 'fs';
import path from 'path';

export function getStepDir(cwd, sessionId, stepNum) {
    return path.join(getNewSessionsDir(cwd), sessionId, stepNum.toString());
}

export function saveStepData(cwd, sessionId, stepNum, data, filename) {
    const stepDir = getStepDir(cwd, sessionId, stepNum);
    fs.mkdirSync(stepDir, { recursive: true });
    const filePath = path.join(stepDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function loadStepData(cwd, sessionId, stepNum, filename) {
    const filePath = path.join(getStepDir(cwd, sessionId, stepNum), filename);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Session dir utils
export function getNewSessionsDir(cwd) {
    return path.join(cwd, 'storage', 'sessions');
}

export function loadNewSession(cwd, sessionId) {
    const sessionFile = path.join(getNewSessionsDir(cwd), 'sessions', sessionId, 'session.json');
    if (!fs.existsSync(sessionFile)) return null;
    return JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
}

export function saveNewSession(cwd, session) {
    const sessionDir = path.join(getNewSessionsDir(cwd), 'sessions', session.id);
    fs.mkdirSync(sessionDir, { recursive: true });
    const sessionFile = path.join(sessionDir, 'session.json');
    fs.writeFileSync(sessionFile, JSON.stringify(session, null, 2));
}

// ... other utils like listNewSteps, loadNewStep etc.

