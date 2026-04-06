import path from 'path';

/** Flat session JSON dir for on-disk project storage: `{projectRoot}/.a2a/sessions`. */
export function getProjectDotA2aSessionsDir(projectPath) {
    return path.join(projectPath, '.a2a', 'sessions');
}
