import path from 'path';

export { SAFE_SEGMENT, isValidSessionId } from '../../shared/session-id.js';

export function safePath(base, sub) {
    const resolved = path.resolve(base, sub);
    if (!resolved.startsWith(path.resolve(base))) return null;
    return resolved;
}

export function getStorageMode(req) {
    const h = req.headers['x-storage-mode'];
    return h === 'project' || h === 'storage' ? h : 'storage';
}
