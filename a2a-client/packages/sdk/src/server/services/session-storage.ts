/**
 * Session persistence - read/write sessions to kv storage
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storageDir = process.env.A2A_CLIENT_STORAGE_DIR || path.join(os.homedir(), '.a2a-client');
const SESSIONS_DATA_DIR = path.join(storageDir, 'kv', 'sessions', 'data');

export interface PersistedSession {
    id: string;
    status?: string;
    startTime?: string;
    endTime?: string | null;
    progress?: number;
    totalSteps?: number;
    currentStep?: string | null;
    context?: Record<string, unknown>;
    execute?: Record<string, unknown>;
    currentExecute?: Record<string, unknown>;
    history?: unknown[];
    connections?: number;
    messages?: unknown[];
    messageCount?: number;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

async function ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
}

export async function loadSessionsFromStorage(): Promise<PersistedSession[]> {
    try {
        await ensureDir(SESSIONS_DATA_DIR);
        const entries = await fs.readdir(SESSIONS_DATA_DIR);
        const sessions: PersistedSession[] = [];
        for (const file of entries) {
            if (!file.endsWith('.json')) continue;
            try {
                const raw = await fs.readFile(path.join(SESSIONS_DATA_DIR, file), 'utf-8');
                const parsed = JSON.parse(raw);
                if (parsed?.value && parsed.value.id) {
                    sessions.push(parsed.value as PersistedSession);
                } else if (parsed?.id) {
                    sessions.push(parsed as PersistedSession);
                }
            } catch (e) {
                console.warn('[SESSION] Skipping corrupt session file:', file, e instanceof Error ? e.message : e);
            }
        }
        return sessions;
    } catch (e) {
        console.error('[SESSION] loadSessionsFromStorage failed:', e instanceof Error ? e.message : e);
        return [];
    }
}

export async function saveSessionToStorage(session: PersistedSession): Promise<void> {
    try {
        await ensureDir(SESSIONS_DATA_DIR);
        const filePath = path.join(SESSIONS_DATA_DIR, `${session.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf-8');
    } catch (err) {
        console.warn('[SESSION] Failed to persist session:', err);
    }
}

export async function deleteSessionFromStorage(sessionId: string): Promise<void> {
    try {
        const filePath = path.join(SESSIONS_DATA_DIR, `${sessionId}.json`);
        await fs.unlink(filePath);
    } catch (e) {
        const code = (e as NodeJS.ErrnoException)?.code;
        if (code !== 'ENOENT') {
            console.warn('[SESSION] deleteSessionFromStorage failed:', sessionId, e instanceof Error ? e.message : e);
        }
    }
}

/** Session IDs from panel state (for stub merge when no persisted session) */
export async function loadSessionIdsFromPanelState(): Promise<{ sessionIds: string[]; projectId: string | null }> {
    try {
        const kvDir = path.join(storageDir, 'kv');
        let sessionIds: string[] = [];
        let projectId: string | null = null;

        const windowsPath = path.join(kvDir, 'ui', 'a2a_session_windows.json');
        try {
            const raw = await fs.readFile(windowsPath, 'utf-8');
            const parsed = JSON.parse(raw);
            const val = parsed?.value ?? parsed;
            const obj = typeof val === 'string' ? JSON.parse(val) : val;
            if (obj?.windows && Array.isArray(obj.windows)) {
                sessionIds = obj.windows.filter((id: unknown) => typeof id === 'string');
            }
        } catch (e) {
            const code = (e as NodeJS.ErrnoException)?.code;
            if (code !== 'ENOENT') {
                console.warn('[SESSION] a2a_session_windows.json:', e instanceof Error ? e.message : e);
            }
        }

        const projectPath = path.join(kvDir, 'config', 'a2a_selected_project.json');
        try {
            const raw = await fs.readFile(projectPath, 'utf-8');
            const parsed = JSON.parse(raw);
            const val = parsed?.value ?? parsed;
            projectId = typeof val === 'string' ? val : null;
        } catch (e) {
            const code = (e as NodeJS.ErrnoException)?.code;
            if (code !== 'ENOENT') {
                console.warn('[SESSION] a2a_selected_project.json:', e instanceof Error ? e.message : e);
            }
        }

        return { sessionIds, projectId };
    } catch (e) {
        console.error('[SESSION] loadSessionIdsFromPanelState failed:', e instanceof Error ? e.message : e);
        return { sessionIds: [], projectId: null };
    }
}
