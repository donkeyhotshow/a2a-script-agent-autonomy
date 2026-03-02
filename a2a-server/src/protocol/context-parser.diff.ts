/** Context diff: compute patch between two context blobs. */

export interface ContextDiff {
    added: string[];
    removed: string[];
    changed: string[];
}

export function diffContextKeys(prev: Record<string, unknown>, next: Record<string, unknown>): ContextDiff {
    const prevKeys = new Set(Object.keys(prev));
    const nextKeys = new Set(Object.keys(next));
    const added = [...nextKeys].filter((k) => !prevKeys.has(k));
    const removed = [...prevKeys].filter((k) => !nextKeys.has(k));
    const changed = [...nextKeys].filter((k) => prevKeys.has(k) && JSON.stringify(prev[k]) !== JSON.stringify(next[k]));
    return {added, removed, changed};
}
