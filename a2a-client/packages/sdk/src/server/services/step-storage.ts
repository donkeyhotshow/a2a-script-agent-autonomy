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
import * as fs from 'fs/promises';
import { getStorageSessionsRoot, writeJsonFile, isNodeEnoent } from './storage.js';

const SESSIONS_DIR = getStorageSessionsRoot();

export function getStepDir(sessionId: string, stepNum: number): string {
    return path.join(SESSIONS_DIR, sessionId, String(stepNum));
}

/** Step artifact written after sync invoke (same layout as Vite step handlers). */
export async function readServerResponse(
    sessionId: string,
    stepNum: number
): Promise<Record<string, unknown> | null> {
    const file = path.join(getStepDir(sessionId, stepNum), 'server-response.json');
    try {
        const raw = await fs.readFile(file, 'utf-8');
        return JSON.parse(raw) as Record<string, unknown>;
    } catch (e) {
        if (!isNodeEnoent(e)) {
            console.warn('[step-storage] readServerResponse:', sessionId, stepNum, e);
        }
        return null;
    }
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
    const { messages, ...rest } = data;
    const file = path.join(getStepDir(sessionId, stepNum), 'server-response.json');
    await writeJsonFile(file, rest);
    if (Array.isArray(messages)) {
        await saveMessages(sessionId, stepNum, messages);
    }
}

export async function saveMessages(
    sessionId: string,
    stepNum: number,
    messages: unknown[]
): Promise<void> {
    const file = path.join(getStepDir(sessionId, stepNum), 'messages.json');
    await writeJsonFile(file, messages);
}
