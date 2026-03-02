/** File block text diff. */

export interface FileBlockDiff {
    path: string;
    added: number;
    removed: number;
    chunks: Array<{ type: 'add' | 'remove' | 'context'; lines: string[] }>;
}

export function diffFileBlocks(prev: string, next: string): FileBlockDiff['chunks'] {
    const a = prev.split(/\r?\n/);
    const b = next.split(/\r?\n/);
    const chunks: Array<{ type: 'add' | 'remove' | 'context'; lines: string[] }> = [];
    let i = 0;
    let j = 0;
    while (i < a.length || j < b.length) {
        if (i < a.length && j < b.length && a[i] === b[j]) {
            chunks.push({type: 'context', lines: [a[i]]});
            i++;
            j++;
        } else if (j < b.length && (i >= a.length || a[i] !== b[j])) {
            chunks.push({type: 'add', lines: [b[j]]});
            j++;
        } else {
            chunks.push({type: 'remove', lines: [a[i]]});
            i++;
        }
    }
    return chunks;
}

export function diffStats(chunks: FileBlockDiff['chunks']): { added: number; removed: number } {
    let added = 0;
    let removed = 0;
    for (const c of chunks) {
        if (c.type === 'add') added += c.lines.length;
        if (c.type === 'remove') removed += c.lines.length;
    }
    return {added, removed};
}
