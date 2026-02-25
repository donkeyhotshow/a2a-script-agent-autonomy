/**
 * File System Reader - Handles file operations
 */
import { IgnoreDetector } from '@a2a/fs-utils';
export interface FileSystemConfig {
    projectPath?: string;
    customIgnoreFiles?: string[];
    enableIgnore?: boolean;
}
export interface ReadFileResult {
    content: string;
    size: number;
    modified: string;
    path: string;
}
export interface ListEntry {
    name: string;
    path: string;
    type: 'directory' | 'file';
}
export interface WriteOptions {
    overwrite?: boolean;
}
export declare class FileSystem {
    projectPath: string;
    ignoreDetector: IgnoreDetector | null;
    private enableIgnore;
    constructor(config?: FileSystemConfig);
    initialize(): Promise<void>;
    exists(filePath: string): Promise<boolean>;
    readFile(filePath: string): Promise<ReadFileResult>;
    writeFile(filePath: string, content: string, options?: WriteOptions): Promise<{
        path: string;
        size: number;
        created: boolean;
    }>;
    deleteFile(filePath: string): Promise<{
        path: string;
        deleted: boolean;
    }>;
    listDirectory(dirPath?: string, options?: {
        recursive?: boolean;
        ignore?: boolean;
    }): Promise<ListEntry[]>;
    runTest(testPath: string): Promise<{
        success: boolean;
        output?: string;
        errors?: string;
        path: string;
    }>;
    getStats(filePath: string): Promise<{
        path: string;
        size: number;
        created: string;
        modified: string;
        isFile: boolean;
        isDirectory: boolean;
    }>;
}
