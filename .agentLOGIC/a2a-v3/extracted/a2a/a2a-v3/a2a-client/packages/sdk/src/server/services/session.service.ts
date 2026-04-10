/**
 * Session Service
 * 
 * Manages session data - loading, saving, listing, and deletion.
 */

import path from 'path';
import * as fs from 'fs/promises';
import type { Session, Project } from '../models/session.model.js';
import { writeJsonFile, getStorageDir } from './storage.js';
import { loadProjects, saveProjects } from './projects.service.js';

/**
 * Get the sessions directory for a project
 * Uses project.path if available, otherwise falls back to storage directory
 */
export function getSessionDir(project: Project): string {
    if (project.path) return path.join(project.path, '.a2a', 'sessions');
    return path.join(getStorageDir(), 'sessions', project.id);
}

/**
 * List all sessions for a project
 */
export async function listSessions(project: Project): Promise<Array<{ id: string; title: string; createdAt?: string }>> {
    const dir = getSessionDir(project);
    try {
        const entries = await fs.readdir(dir);
        const sessions: Array<{ id: string; title: string; createdAt?: string }> = [];
        for (const file of entries) {
            if (!file.endsWith('.json')) continue;
            const sessionId = file.replace('.json', '');
            try {
                const raw = await fs.readFile(path.join(dir, file), 'utf-8');
                const session = JSON.parse(raw) as Session;
                sessions.push({
                    id: sessionId,
                    title: session.title || 'Untitled',
                    createdAt: session.createdAt,
                });
            } catch {
                // Skip invalid session files
            }
        }
        sessions.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        return sessions;
    } catch {
        return [];
    }
}

/**
 * Load a single session by ID
 */
export async function loadSession(project: Project, sessionId: string): Promise<Session | null> {
    const file = path.join(getSessionDir(project), `${sessionId}.json`);
    try {
        const raw = await fs.readFile(file, 'utf-8');
        return JSON.parse(raw) as Session;
    } catch {
        return null;
    }
}

/**
 * Find session across all projects
 * Used when projectId is unknown or mismatched
 */
export async function findSessionInAllProjects(sessionId: string): Promise<{ session: Session; project: Project } | null> {
    const projects = await loadProjects();
    for (const project of projects) {
        const session = await loadSession(project, sessionId);
        if (session) {
            return { session, project };
        }
    }
    return null;
}

/**
 * Save a session to storage
 */
export async function saveSession(project: Project, session: Session): Promise<void> {
    const dir = getSessionDir(project);
    await fs.mkdir(dir, { recursive: true });
    const file = path.join(dir, `${session.id}.json`);
    await writeJsonFile(file, session);
}

/**
 * Delete a session from storage
 */
export async function deleteSession(project: Project, sessionId: string): Promise<void> {
    const file = path.join(getSessionDir(project), `${sessionId}.json`);
    try {
        await fs.unlink(file);
    } catch {
        // ignore
    }
}
