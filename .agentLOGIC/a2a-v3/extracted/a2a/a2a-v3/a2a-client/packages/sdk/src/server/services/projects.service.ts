/**
 * Projects Service
 * 
 * Manages project data - loading, saving, and path validation.
 */

import path from 'path';
import type { Project } from '../models/session.model.js';
import { readJsonFile, writeJsonFile, PROJECTS_FILE } from './storage.js';

/**
 * Load all projects from storage
 */
export async function loadProjects(): Promise<Project[]> {
    const data = await readJsonFile<{ projects: Project[] }>(PROJECTS_FILE, { projects: [] });
    return Array.isArray(data.projects) ? data.projects : [];
}

/**
 * Save all projects to storage
 */
export async function saveProjects(projects: Project[]): Promise<void> {
    await writeJsonFile(PROJECTS_FILE, { projects });
}

/**
 * Safely resolve a path within a base directory
 * Returns null if the resolved path escapes the base directory
 */
export function safePath(base: string, subPath: string): string | null {
    const resolved = path.resolve(base, subPath);
    const baseResolved = path.resolve(base);
    const prefix = baseResolved.endsWith(path.sep) ? baseResolved : baseResolved + path.sep;
    if (resolved !== baseResolved && !resolved.startsWith(prefix)) return null;
    return resolved;
}
