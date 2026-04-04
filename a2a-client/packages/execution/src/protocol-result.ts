/**
 * Protocol result shapes for read-file, write-file, list-directory.
 * Task: tasks/client/10-fs-utils-read-write-list-protocol-alignment.md
 *
 * result["read-file"] = { path, content }; result["write-file"] = { path, success/written }; result["list-directory"] = { path, entries }
 * Helpers so api-server can embed fs-utils output directly; path validation per policy (Task 39)
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export type ReadFileResult = { path: string; content: string; error?: string };
export type WriteFileResult = { path: string; success: boolean; written?: boolean; error?: string };
export type ListDirectoryEntry = { name: string; type?: string; size?: number };
export type ListDirectoryResult = { path: string; entries: ListDirectoryEntry[]; error?: string };

/** Read file and return protocol shape */
export async function readFileForResult(filePath: string, options?: { encoding?: BufferEncoding }): Promise<ReadFileResult> {
    try {
        const encoding = options?.encoding ?? 'utf8';
        const content = await fs.readFile(filePath, {encoding});
        return {
            path: filePath,
            content
        };
    } catch (error) {
        throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/** Write file and return protocol shape */
export async function writeFileForResult(filePath: string, content: string): Promise<WriteFileResult> {
    try {
        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        
        await fs.writeFile(filePath, content, 'utf8');
        return {
            path: filePath,
            success: true,
            written: true
        };
    } catch (error) {
        throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/** List directory and return protocol shape */
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