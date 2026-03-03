/**
 * Protocol result shapes for read-file, write-file, list-directory – stub.
 * Task: tasks/client/10-fs-utils-read-write-list-protocol-alignment.md
 *
 * TODO(10): result["read-file"] = { path, content }; result["write-file"] = { path, written }; result["list-directory"] = { path, entries }
 * TODO(10): helpers so api-server can embed fs-utils output directly; path validation per policy (Task 39)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type ReadFileResult = { path: string; content: string };
export type WriteFileResult = { path: string; written: boolean };
export type ListDirectoryEntry = { name: string; type?: string; size?: number };
export type ListDirectoryResult = { path: string; entries: ListDirectoryEntry[] };

/** TODO(10): implement – read file and return protocol shape */
export async function readFileForResult(path: string, options?: { encoding?: string }): Promise<ReadFileResult> {
    try {
        const content = await fs.readFile(path, options?.encoding || 'utf8');
        return {
            path,
            content: typeof content === 'string' ? content : content.toString()
        };
    } catch (error) {
        throw new Error(`Failed to read file ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/** TODO(10): implement – write and return protocol shape */
export async function writeFileForResult(filePath: string, content: string): Promise<WriteFileResult> {
    try {
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        await fs.writeFile(filePath, content, 'utf8');
        return {
            path: filePath,
            written: true
        };
    } catch (error) {
        throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/** TODO(10): implement – list dir and return protocol shape */
export async function listDirectoryForResult(dirPath: string): Promise<ListDirectoryResult> {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        const listEntries: ListDirectoryEntry[] = await Promise.all(
            entries.map(async (entry) => {
                const fullPath = path.join(dirPath, entry.name);
                const entryInfo: ListDirectoryEntry = {
                    name: entry.name,
                    type: entry.isDirectory() ? 'directory' : entry.isFile() ? 'file' : 'other'
                };
                
                // Get file size for files
                if (entry.isFile()) {
                    try {
                        const stats = await fs.stat(fullPath);
                        entryInfo.size = stats.size;
                    } catch (error) {
                        // If we can't get stats, size will be undefined
                    }
                }
                
                return entryInfo;
            })
        );
        
        return {
            path: dirPath,
            entries: listEntries
        };
    } catch (error) {
        throw new Error(`Failed to list directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
