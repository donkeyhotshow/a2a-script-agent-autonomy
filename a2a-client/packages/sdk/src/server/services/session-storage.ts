/**
 * Session persistence - read/write sessions to kv storage
 */

import fs from 'fs/promises';
import path from 'path';

import { getKvRoot, isNodeEnoent, unwrapKvStoredValue } from './storage.js';

const SESSIONS_DATA_DIR = path.join(getKvRoot(), 'sessions', 'data');

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

/** Read JSON from disk and unwrap `{ value: T }` KV shape; ENOENT → null, other errors logged. */
async function readUnwrappedKvJsonFile(filePath: string, logLabel: string): Promise<unknown | null> {
    try {
        const raw = await fs.readFile(filePath, 'utf-8');
        return unwrapKvStoredValue(JSON.parse(raw) as unknown);
    } catch (e) {
        if (!isNodeEnoent(e)) {
            console.error(`[SESSION] ${logLabel}:`, e instanceof Error ? e.message : e);
        }
        return null;
    }
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
                const parsed = JSON.parse(raw) as unknown;
                const body = unwrapKvStoredValue(parsed);
                if (body && typeof body === 'object' && !Array.isArray(body) && typeof (body as PersistedSession).id === 'string') {
                    sessions.push(body as PersistedSession);
                }
            } catch (e) {
                console.error('[SESSION] Skipping corrupt session file:', file, e instanceof Error ? e.message : e);
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
        console.error('[SESSION] Failed to persist session:', err);
    }
}

export async function deleteSessionFromStorage(sessionId: string): Promise<void> {
    try {
        const filePath = path.join(SESSIONS_DATA_DIR, `${sessionId}.json`);
        await fs.unlink(filePath);
    } catch (e) {
        if (!isNodeEnoent(e)) {
            console.error('[SESSION] deleteSessionFromStorage failed:', sessionId, e instanceof Error ? e.message : e);
        }
    }
}

/** Session IDs from panel state (for stub merge when no persisted session) */
export async function loadSessionIdsFromPanelState(): Promise<{ sessionIds: string[]; projectId: string | null }> {
    try {
        const kvDir = getKvRoot();
        let sessionIds: string[] = [];
        let projectId: string | null = null;

        const windowsPath = path.join(kvDir, 'ui', 'a2a_session_windows.json');
        const windowsVal = await readUnwrappedKvJsonFile(windowsPath, 'a2a_session_windows.json');
        let windowsObj: unknown = windowsVal;
        if (typeof windowsVal === 'string') {
            try {
                windowsObj = JSON.parse(windowsVal);
            } catch (e) {
                console.error('[SESSION] a2a_session_windows.json (inner):', e instanceof Error ? e.message : e);
                windowsObj = null;
            }
        }
        if (windowsObj && typeof windowsObj === 'object' && Array.isArray((windowsObj as { windows?: unknown }).windows)) {
            sessionIds = (windowsObj as { windows: unknown[] }).windows.filter((id: unknown) => typeof id === 'string');
        }

        const selectedProjectPath = path.join(kvDir, 'config', 'a2a_selected_project.json');
        const projectVal = await readUnwrappedKvJsonFile(selectedProjectPath, 'a2a_selected_project.json');
        projectId = typeof projectVal === 'string' ? projectVal : null;

        return { sessionIds, projectId };
    } catch (e) {
        console.error('[SESSION] loadSessionIdsFromPanelState failed:', e instanceof Error ? e.message : e);
        return { sessionIds: [], projectId: null };
    }
}
