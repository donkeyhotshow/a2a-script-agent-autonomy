import {logger} from '@a2a/server-utils/logger';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {ReadFileActionInput, ReadFileActionOutput} from './types.js';
import {validatePath} from './security.js';
import {executeAction} from '../../utils.js';

export async function executeReadFile(
    input: ReadFileActionInput
): Promise<ReadFileActionOutput> {
    return executeAction(
        'read-file',
        input,
        (input) => validatePath(input.filePath),
        async (input) => {
            const fullPath = path.resolve(input.filePath);
            const encoding = input.encoding || 'utf8';
            const maxSize = input.maxSize || 1024 * 1024;

            const stats = await fs.stat(fullPath);
            if (stats.size > maxSize) {
                const buffer = Buffer.alloc(maxSize);
                const fd = await fs.open(fullPath, 'r');
                await fd.read(buffer, 0, maxSize, 0);
                await fd.close();

                let content = buffer.toString(encoding);

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

            let content = await fs.readFile(fullPath, encoding);

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
        }
    );
}
