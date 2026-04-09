/**
 * Shared types for file operation handlers.
 */

export interface ReadFileActionInput {
    filePath: string;
    encoding?: BufferEncoding;
    maxSize?: number;
    lineRange?: [number, number];
}

export interface WriteFileActionInput {
    filePath: string;
    content: string;
    encoding?: BufferEncoding;
    overwrite?: boolean;
    createBackup?: boolean;
}

export interface FileExistsActionInput {
    path: string;
    filePath?: string;
    type?: 'file' | 'directory' | 'any';
}

export interface ListDirActionInput {
    dirPath: string;
    recursive?: boolean;
    pattern?: string;
    maxDepth?: number;
    limit?: number;
}

export interface ReadFileActionOutput {
    success: boolean;
    content?: string;
    filePath?: string;
    size?: number;
    encoding?: string;
    truncated?: boolean;
    error?: string;
}

export interface WriteFileActionOutput {
    success: boolean;
    filePath?: string;
    bytesWritten?: number;
    backupPath?: string;
    error?: string;
}

export interface FileExistsActionOutput {
    success: boolean;
    exists?: boolean;
    isFile?: boolean;
    isDirectory?: boolean;
    size?: number;
    modifiedAt?: Date;
    error?: string;
}

export interface ListDirActionOutput {
    success: boolean;
    files?: Array<{
        name: string;
        path: string;
        isFile: boolean;
        isDirectory: boolean;
        size: number;
        modifiedAt: Date;
    }>;
    truncated?: boolean;
    error?: string;
}
