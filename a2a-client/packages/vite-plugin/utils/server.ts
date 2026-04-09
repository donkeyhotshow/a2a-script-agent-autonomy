export { SAFE_SEGMENT, isValidSessionId } from '@a2a-client/shared/session-id.ts';
export { safePath } from '@a2a/shared/safe-path.mjs';

export function getStorageMode(req) {
    const h = req.headers['x-storage-mode'];
    return h === 'project' || h === 'storage' ? h : 'storage';
}
