/**
 * Action Handler: file-operations
 * 
 * Handles read-file and write-file actions.
 */

import {logger} from '../../utils/logger.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export interface ReadFileActionInput {
    filePath: string;
    encoding?: BufferEncoding;
    maxSize?: number; // in bytes
    lineRange?: [number, number]; // [start, end] 1-indexed
}

export interface WriteFileActionInput {
    filePath: string;
    content: string;
    encoding?: BufferEncoding;
    overwrite?: boolean;
    createBackup?: boolean;
}

export interface FileExistsActionInput {
    filePath: string;
}

export interface ListDirActionInput {
    dirPath: string;
    recursive?: boolean;
    pattern?: string; // glob pattern
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
    error?: string;
}

/**
 * Execute read-file action
 */
export async function executeReadFile(
    input: ReadFileActionInput
): Promise<ReadFileActionOutput> {
    logger.info('[read-file] Executing', {filePath: input.filePath});

    try {
        // Validate path
        const validation = validatePath(input.filePath);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }

        const fullPath = path.resolve(input.filePath);
        const encoding = input.encoding || 'utf8';
        const maxSize = input.maxSize || 1024 * 1024; // 1MB default

        // Check file size
        const stats = await fs.stat(fullPath);
        if (stats.size > maxSize) {
            // Read partial content if too large
            const buffer = Buffer.alloc(maxSize);
            const fd = await fs.open(fullPath, 'r');
            await fd.read(buffer, 0, maxSize, 0);
            await fd.close();

            let content = buffer.toString(encoding);
            
            // If line range specified, filter
            if (input.lineRange) {
                const lines = content.split('\n');
                const [start, end] = input.lineRange;
                content = lines.slice(start - 1, end).join('\n');
            }

            return {
                success: true,
                content,
                filePath: input.filePath,
                size: stats.size,
                encoding,
                truncated: true,
            };
        }

        // Read full file
        let content = await fs.readFile(fullPath, encoding);

        // If line range specified, filter
        if (input.lineRange) {
            const lines = content.split('\n');
            const [start, end] = input.lineRange;
            content = lines.slice(start - 1, end).join('\n');
        }

        logger.info('[read-file] File read successfully', {
            filePath: input.filePath,
            size: stats.size,
        });

        return {
            success: true,
            content,
            filePath: input.filePath,
            size: stats.size,
            encoding,
            truncated: false,
        };
    } catch (error) {
        logger.error('[read-file] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute write-file action
 */
export async function executeWriteFile(
    input: WriteFileActionInput
): Promise<WriteFileActionOutput> {
    logger.info('[write-file] Executing', {filePath: input.filePath});

    try {
        // Validate path
        const validation = validatePath(input.filePath);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }

        const fullPath = path.resolve(input.filePath);
        const dir = path.dirname(fullPath);
        const encoding = input.encoding || 'utf8';

        // Check if file exists
        let fileExists = false;
        try {
            await fs.access(fullPath);
            fileExists = true;
        } catch {
            fileExists = false;
        }

        if (fileExists && !input.overwrite) {
            return {
                success: false,
                error: 'File already exists and overwrite is false',
            };
        }

        // Create backup if requested
        let backupPath: string | undefined;
        if (fileExists && input.createBackup) {
            backupPath = `${fullPath}.backup-${Date.now()}`;
            await fs.copyFile(fullPath, backupPath);
            logger.info('[write-file] Backup created', {backupPath});
        }

        // Ensure directory exists
        await fs.mkdir(dir, {recursive: true});

        // Write file
        await fs.writeFile(fullPath, input.content, encoding);
        const bytesWritten = Buffer.byteLength(input.content, encoding);

        logger.info('[write-file] File written successfully', {
            filePath: input.filePath,
            bytesWritten,
        });

        return {
            success: true,
            filePath: input.filePath,
            bytesWritten,
            backupPath,
        };
    } catch (error) {
        logger.error('[write-file] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute file-exists action
 */
export async function executeFileExists(
    input: FileExistsActionInput
): Promise<FileExistsActionOutput> {
    logger.info('[file-exists] Executing', {filePath: input.filePath});

    try {
        const fullPath = path.resolve(input.filePath);

        try {
            const stats = await fs.stat(fullPath);

            return {
                success: true,
                exists: true,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modifiedAt: stats.mtime,
            };
        } catch {
            return {
                success: true,
                exists: false,
            };
        }
    } catch (error) {
        logger.error('[file-exists] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

/**
 * Execute list-directory action
 */
export async function executeListDirectory(
    input: ListDirActionInput
): Promise<ListDirActionOutput> {
    logger.info('[list-directory] Executing', {
        dirPath: input.dirPath,
        recursive: input.recursive,
    });

    try {
        const fullPath = path.resolve(input.dirPath);

        // Validate path
        const validation = validatePath(input.dirPath);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }

        const files: ListDirActionOutput['files'] = [];

        async function readDir(dir: string, baseDir: string) {
            const entries = await fs.readdir(dir, {withFileTypes: true});

            for (const entry of entries) {
                const entryPath = path.join(dir, entry.name);
                const relativePath = path.relative(baseDir, entryPath);

                // Apply pattern filter if specified
                if (input.pattern) {
                    const regex = new RegExp(input.pattern.replace(/\*/g, '.*'));
                    if (!regex.test(entry.name)) {
                        continue;
                    }
                }

                const stats = await fs.stat(entryPath);

                files.push({
                    name: entry.name,
                    path: relativePath,
                    isFile: entry.isFile(),
                    isDirectory: entry.isDirectory(),
                    size: stats.size,
                    modifiedAt: stats.mtime,
                });

                // Recurse if directory and recursive mode
                if (entry.isDirectory() && input.recursive) {
                    await readDir(entryPath, baseDir);
                }
            }
        }

        await readDir(fullPath, fullPath);

        logger.info('[list-directory] Directory listed', {
            dirPath: input.dirPath,
            fileCount: files.length,
        });

        return {
            success: true,
            files,
        };
    } catch (error) {
        logger.error('[list-directory] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}

// ============== Private Helpers ==============

function validatePath(filePath: string): {valid: boolean; error?: string} {
    // Check for path traversal attempts
    const resolved = path.resolve(filePath);
    const cwd = process.cwd();

    // Prevent access outside workspace (with exceptions for /tmp, etc.)
    const allowedPrefixes = [cwd, '/tmp', '/var/tmp', process.env.HOME || ''];
    
    const isAllowed = allowedPrefixes.some(prefix => 
        prefix && resolved.startsWith(path.resolve(prefix))
    );

    if (!isAllowed) {
        return {
            valid: false,
            error: 'Path is outside allowed directories',
        };
    }

    // Check for suspicious patterns
    if (filePath.includes('\0')) {
        return {
            valid: false,
            error: 'Path contains null bytes',
        };
    }

    return {valid: true};
}
