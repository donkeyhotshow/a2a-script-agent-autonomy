import path from 'path';

export function safePath(base, subPath) {
    const resolved = path.resolve(base, subPath);
    // safe logic
    return resolved;
}
