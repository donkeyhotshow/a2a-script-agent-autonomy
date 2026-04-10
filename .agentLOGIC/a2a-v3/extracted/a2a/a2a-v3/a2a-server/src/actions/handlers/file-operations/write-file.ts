import {logger} from '../../../utils/logger.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {WriteFileActionInput, WriteFileActionOutput} from './types.js';
import {validatePath} from './security.js';

export async function executeWriteFile(
    input: WriteFileActionInput
): Promise<WriteFileActionOutput> {
    logger.info('[write-file] Executing', {filePath: input.filePath});

    try {
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

        let backupPath: string | undefined;
        if (fileExists && input.createBackup) {
            backupPath = `${fullPath}.backup-${Date.now()}`;
            await fs.copyFile(fullPath, backupPath);
            logger.info('[write-file] Backup created', {backupPath});
        }

        await fs.mkdir(dir, {recursive: true});

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
