import {logger} from '../../../utils/logger.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {ListDirActionInput, ListDirActionOutput} from './types.js';
import {validatePath} from './security.js';

export async function executeListDirectory(
    input: ListDirActionInput
): Promise<ListDirActionOutput> {
    logger.info('[list-directory] Executing', {
        dirPath: input.dirPath,
        recursive: input.recursive,
        maxDepth: input.maxDepth,
        limit: input.limit,
    });

    try {
        const fullPath = path.resolve(input.dirPath);

        const validation = validatePath(input.dirPath);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
            };
        }

        const files: ListDirActionOutput['files'] = [];
        let reachedLimit = false;

        const readDir = async (dir: string, baseDir: string, currentDepth: number): Promise<void> => {
            if (input.maxDepth !== undefined && currentDepth > input.maxDepth) {
                return;
            }

            if (input.limit !== undefined && files.length >= input.limit) {
                reachedLimit = true;
                return;
            }

            const entries = await fs.readdir(dir, {withFileTypes: true});

            for (const entry of entries) {
                if (input.limit !== undefined && files.length >= input.limit) {
                    reachedLimit = true;
                    break;
                }

                const entryPath = path.join(dir, entry.name);
                const relativePath = path.relative(baseDir, entryPath);

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

                if (entry.isDirectory() && input.recursive) {
                    await readDir(entryPath, baseDir, currentDepth + 1);
                }
            }
        };

        await readDir(fullPath, fullPath, 0);

        logger.info('[list-directory] Directory listed', {
            dirPath: input.dirPath,
            fileCount: files.length,
            reachedLimit,
        });

        return {
            success: true,
            files,
            truncated: reachedLimit,
        };
    } catch (error) {
        logger.error('[list-directory] Execution failed', {error: String(error)});
        return {
            success: false,
            error: String(error),
        };
    }
}
