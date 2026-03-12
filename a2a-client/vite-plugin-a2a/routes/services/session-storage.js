/**
 * Session Storage Service
 * Extracted from stepRoutes.js storage operations
 * Wrapper around ../storage/newSessions.js with consistent error handling
 */

import {
    getNewSessionLatestStep,
    getNewStepDir,
    listNewSteps,
    loadNewStep,
    saveNewStep,
    saveClientResult,
    saveRequestToServer,
    saveServerResponse,
    saveServerPromise,
    loadServerResponse,
    loadServerPromise,
    loadNewSession,
    saveNewSession,
    loadStepFile
} from '../../storage/newSessions.js';

/**
 * Session storage operations with consistent logging/error handling
 */
export class SessionStorageService {
    cwd;

    constructor(cwd) {
        this.cwd = cwd;
    }

    /**
     * Get latest step number for session
     */
    getLatestStep(sessionId) {
        return getNewSessionLatestStep(this.cwd, sessionId);
    }

    /**
     * List all steps for session
     */
    listSteps(sessionId) {
        return listNewSteps(this.cwd, sessionId);
    }

    /**
     * Load step data
     */
    loadStep(sessionId, stepNum) {
        return loadNewStep(this.cwd, sessionId, stepNum);
    }

    /**
     * Save new step
     */
    async saveStep(sessionId, stepNum, data) {
        await saveNewStep(this.cwd, sessionId, stepNum, data);
    }

    /**
     * Save client result for step
     */
    async saveClientResult(sessionId, stepNum, result) {
        await saveClientResult(this.cwd, sessionId, stepNum, result);
    }

    /**
     * Save request to server
     */
    async saveRequestToServer(sessionId, stepNum, request) {
        await saveRequestToServer(this.cwd, sessionId, stepNum, request);
    }

    /**
     * Save server response
     */
    async saveServerResponse(sessionId, stepNum, response) {
        await saveServerResponse(this.cwd, sessionId, stepNum, response);
    }

    /**
     * Save server promise
     */
    async saveServerPromise(sessionId, stepNum, promise) {
        await saveServerPromise(this.cwd, sessionId, stepNum, promise);
    }

    /**
     * Load server response
     */
    loadServerResponse(sessionId, stepNum) {
        return loadServerResponse(this.cwd, sessionId, stepNum);
    }

    /**
     * Load server promise
     */
    loadServerPromise(sessionId, stepNum) {
        return loadServerPromise(this.cwd, sessionId, stepNum);
    }

    /**
     * Load session data
     */
    loadSession(sessionId) {
        return loadNewSession(this.cwd, sessionId);
    }

    /**
     * Save session data
     */
    async saveSession(session) {
        await saveNewSession(this.cwd, session);
    }

    /**
     * Load step file by type
     */
    loadStepFile(sessionId, stepNum, filename) {
        return loadStepFile(this.cwd, sessionId, stepNum, filename);
    }

    /**
     * Get step directory path
     */
    getStepDir(sessionId, stepNum) {
        return getNewStepDir(this.cwd, sessionId, stepNum);
    }
}

// Default instance creator
export function createSessionStorageService(cwd) {
    return new SessionStorageService(cwd);
}

