/**
 * Step Storage Service
 *
 * Persists step files to storage/sessions/{sessionId}/{step}/:
 * - request-to-server.json (before server request)
 * - client-result.json (from web client)
 * - server-promise.json (async promise, stored in N+1/)
 * - server-response.json (server response)
 * - messages.json (chat history)
 */

import path from 'path';
import { getStorageDir, writeJsonFile } from './storage.js';

const SESSIONS_DIR = path.join(getStorageDir(), 'sessions');

export function getStepDir(sessionId: string, stepNum: number): string {
    return path.join(SESSIONS_DIR, sessionId, String(stepNum));
}

export async function saveRequestToServer(
    sessionId: string,
    stepNum: number,
    data: Record<string, unknown>
): Promise<void> {
    const file = path.join(getStepDir(sessionId, stepNum), 'request-to-server.json');
    await writeJsonFile(file, data);
}

export async function saveClientResult(
    sessionId: string,
    stepNum: number,
    data: Record<string, unknown>
): Promise<void> {
    const file = path.join(getStepDir(sessionId, stepNum), 'client-result.json');
    await writeJsonFile(file, data);
}

export async function saveServerPromise(
    sessionId: string,
    stepNum: number,
    data: Record<string, unknown>
): Promise<void> {
    const file = path.join(getStepDir(sessionId, stepNum), 'server-promise.json');
    await writeJsonFile(file, data);
}

export async function saveServerResponse(
    sessionId: string,
    stepNum: number,
    data: Record<string, unknown>
): Promise<void> {
    const file = path.join(getStepDir(sessionId, stepNum), 'server-response.json');
    await writeJsonFile(file, data);
}

export async function saveMessages(
    sessionId: string,
    stepNum: number,
    messages: unknown[]
): Promise<void> {
    const file = path.join(getStepDir(sessionId, stepNum), 'messages.json');
    await writeJsonFile(file, messages);
}
