/** File system helpers for file blocks. */

import * as fs from 'fs/promises';

export async function readFileSafe(path: string): Promise<string | null> {
    try {
        return await fs.readFile(path, 'utf8');
    } catch {
        return null;
    }
}

export async function writeFileSafe(path: string, content: string): Promise<boolean> {
    try {
        await fs.writeFile(path, content, 'utf8');
        return true;
    } catch {
        return false;
    }
}

export async function fileExists(path: string): Promise<boolean> {
    try {
        await fs.access(path);
        return true;
    } catch {
        return false;
    }
}

