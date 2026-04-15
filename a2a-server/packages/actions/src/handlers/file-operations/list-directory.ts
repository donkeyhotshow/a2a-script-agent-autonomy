import {logger} from '@a2a/server-utils/logger';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {ListDirActionInput, ListDirActionOutput} from './types.js';
import {validatePath} from './security.js';
import {executeAction} from '../../utils.js';

export async function executeListDirectory(
    input: ListDirActionInput
): Promise<ListDirActionOutput> {
    return executeAction(
        'list-directory',
        input,
        (input) => validatePath(input.dirPath),
        async (input) => {
            const fullPath = path.resolve(input.dirPath);

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
        }
    );
}
