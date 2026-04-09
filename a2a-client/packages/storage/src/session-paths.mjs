import path from 'path';

/** Flat session JSON dir for on-disk project storage: `{projectRoot}/.a2a/sessions`. */
export function getProjectDotA2aSessionsDir(projectPath) {
    if (typeof projectPath !== 'string' || !projectPath.trim()) {
        throw new Error('projectPath required');
    }
    return path.resolve(projectPath, '.a2a', 'sessions');
}
