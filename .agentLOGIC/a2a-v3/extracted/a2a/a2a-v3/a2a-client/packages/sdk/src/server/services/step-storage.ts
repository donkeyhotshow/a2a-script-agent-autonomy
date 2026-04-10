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
import fs from 'node:fs/promises';
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

export interface ArtifactEntry {
    index: number;
    type: 'code' | 'text' | 'diff' | 'json' | 'error';
    name: string;
    content: string;
    language?: string;
}

export async function saveServerResponse(
    sessionId: string,
    stepNum: number,
    data: Record<string, unknown>
): Promise<void> {
    const { messages, artifacts, ...rest } = data;
    const stepDir = getStepDir(sessionId, stepNum);
    const file = path.join(stepDir, 'server-response.json');
    await writeJsonFile(file, rest);

    if (Array.isArray(messages)) {
        await saveMessages(sessionId, stepNum, messages);
    }

    if (Array.isArray(artifacts) && artifacts.length > 0) {
        await saveArtifacts(stepDir, artifacts as ArtifactEntry[]);
    }
}

async function saveArtifacts(stepDir: string, artifacts: ArtifactEntry[]): Promise<void> {
    await fs.mkdir(stepDir, { recursive: true });

    for (const artifact of artifacts) {
        const safeName = artifact.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(stepDir, `artifact-${artifact.index}-${safeName}`);
        await fs.writeFile(filePath, artifact.content, 'utf8');
    }

    const indexPath = path.join(stepDir, 'artifacts-index.json');
    const index = artifacts.map(a => ({
        index:    a.index,
        type:     a.type,
        name:     a.name,
        language: a.language,
    }));
    await writeJsonFile(indexPath, index);
}

export async function saveMessages(
    sessionId: string,
    stepNum: number,
    messages: unknown[]
): Promise<void> {
    const file = path.join(getStepDir(sessionId, stepNum), 'messages.json');
    await writeJsonFile(file, messages);
}
