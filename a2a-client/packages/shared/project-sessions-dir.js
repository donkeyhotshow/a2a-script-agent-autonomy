import { join } from 'node:path';

/**
 * Get the .a2a/sessions directory path for a project
 * @param {string} projectPath - Absolute path to the project directory
 * @returns {string} Absolute path to the project's .a2a/sessions directory
 */
export function getProjectDotA2aSessionsDir(projectPath) {
    return join(projectPath, '.a2a', 'sessions');
}