/**
 * Projects Service
 * 
 * Manages project data - loading, saving, and path validation.
 */

import { projectsListFromDocument } from '@a2a/shared/projects-document.mjs';
import type { Project } from '../models/session.model.js';
import { readJsonFile, writeJsonFile, PROJECTS_FILE } from './storage.js';

/**
 * Load all projects from storage
 */
export async function loadProjects(): Promise<Project[]> {
    const data = await readJsonFile<Record<string, unknown>>(PROJECTS_FILE, { projects: [] });
    return projectsListFromDocument(data) as Project[];
}

/**
 * Save all projects to storage
 */
export async function saveProjects(projects: Project[]): Promise<void> {
    await writeJsonFile(PROJECTS_FILE, { projects });
}

export { safePath } from '@a2a/shared/safe-path.mjs';
