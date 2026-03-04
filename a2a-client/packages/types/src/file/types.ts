/**
 * File Types
 * 
 * Types related to file operations
 */

export interface FileBlock {
    path: string;
    content: string;
    startLine?: number;
    endLine?: number;
}

export interface FileBlockRequest {
    path: string;
    startLine?: number;
    endLine?: number;
}

/**
 * Factory options for creating file blocks
 */
export interface CreateFileBlockOptions {
    path: string;
    content: string;
    startLine?: number;
    endLine?: number;
}

/**
 * Create a file block with default values
 */
export function createFileBlock(options: CreateFileBlockOptions): FileBlock {
    return {
        path: options.path,
        content: options.content,
        startLine: options.startLine,
        endLine: options.endLine,
    };
}
