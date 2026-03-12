import path from 'path';

export const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;

export function safePath(base, sub) {
    const resolved = path.resolve(base, sub);
    if (!resolved.startsWith(path.resolve(base))) return null;
    return resolved;
}

export function isValidSessionId(id) {
    return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 64;
}

export function getStorageMode(req) {
    const h = req.headers['x-storage-mode'];
    return h === 'project' || h === 'storage' ? h : 'storage';
}
