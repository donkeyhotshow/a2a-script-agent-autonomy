import {logger} from '../../../utils/logger';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import type {FileExistsActionInput, FileExistsActionOutput} from './types';

export async function executeFileExists(
    input: FileExistsActionInput
): Promise<FileExistsActionOutput> {
    logger.info('[file-exists] Executing', {path: input.path});

    try {
        const filePath = input.path || input.filePath || '';
        if (!filePath) {
            return {
                success: false,
                error: 'Path is required',
            };
        }
        const fullPath = path.resolve(filePath);

        try {
            const stats = await fs.stat(fullPath);

            if (input.type === 'file' && !stats.isFile()) {
                return {
                    success: true,
                    exists: false,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                };
            }

            if (input.type === 'directory' && !stats.isDirectory()) {
                return {
                    success: true,
                    exists: false,
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                };
            }

            return {
                success: true,
                exists: true,
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modifiedAt: stats.mtime,
            };
        } catch (err: unknown) {
            const code = (err as NodeJS.ErrnoException)?.code;
            if (code && code !== 'ENOENT') {
                logger.warn('[file-exists] stat failed', { fullPath, code, error: String(err) });
            }
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
