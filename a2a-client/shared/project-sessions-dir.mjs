import path from 'path';

/** Flat session JSON dir for on-disk project storage: `{projectRoot}/.a2a/sessions`. */
export function getProjectDotA2aSessionsDir(projectPath) {
    if (typeof projectPath !== 'string' || !projectPath.trim()) {
        throw new TypeError(
            '[getProjectDotA2aSessionsDir] projectPath must be a non-empty string'
        );
    }
    return path.join(path.resolve(projectPath.trim()), '.a2a', 'sessions');
}
