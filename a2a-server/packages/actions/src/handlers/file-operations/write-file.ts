import {logger} from '../../../utils/logger';
import {pathIsAccessible, timestampedBackupPath} from '../../../utils/fs-access';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {WriteFileActionInput, WriteFileActionOutput} from './types';
import {validatePath} from './security';
import {SWEVerifier} from '../../services/core/swe-verifier';
import {executeAction} from '../../utils';

export async function executeWriteFile(
    input: WriteFileActionInput
): Promise<WriteFileActionOutput> {
    return executeAction(
        'write-file',
        input,
        // CWE-22/23: resolve first, then validate the resolved path
        (input) => validatePath(path.resolve(input.filePath)),
        async (input) => {
            const fullPath = path.resolve(input.filePath);
            const dir = path.dirname(fullPath);
            const encoding = input.encoding || 'utf8';

            const fileExists = await pathIsAccessible(fullPath, (m) =>
                logger.warn('[write-file] access check failed', {
                    fullPath: m.filePath,
                    code: m.code,
                    error: m.error,
                })
            );

            if (fileExists && !input.overwrite) {
                return {
                    success: false,
                    error: 'File already exists and overwrite is false',
                };
            }

            let backupPath: string | undefined;
            if (fileExists && input.createBackup) {
                backupPath = timestampedBackupPath(fullPath);
                await fs.copyFile(fullPath, backupPath);
                logger.info('[write-file] Backup created', {backupPath});
            }

            await fs.mkdir(dir, {recursive: true});

            await fs.writeFile(fullPath, input.content, encoding);
            const bytesWritten = Buffer.byteLength(input.content, encoding);

            // -- SWEVerifier Integration (ADR-0066) --
            let verificationPassed = true;
            let verificationErrors: string[] | undefined;
            try {
                const verifier = new SWEVerifier();
                const verification = await verifier.verify(fullPath, input.content);
                if (!verification.passed) {
                    verificationPassed = false;
                    verificationErrors = verification.errors || [];
                    logger.warn('[write-file] SWEVerifier validation failed', {
                        filePath: input.filePath,
                        errors: verificationErrors
                    });
                } else {
                    logger.info('[write-file] SWEVerifier pass', {
                        filePath: input.filePath, stage: verification.stage
                    });
                }
            } catch (e) {
                logger.error('[write-file] SWEVerifier internal error', { error: String(e) });
            }
            // ----------------------------------------

            logger.info('[write-file] File written successfully', {
                filePath: input.filePath,
                bytesWritten,
            });

            const output: any = {
                success: verificationPassed,
                filePath: input.filePath,
                bytesWritten,
                backupPath,
            };

            if (!verificationPassed) {
                output.error = `Verification Failed: ${verificationErrors?.join(', ')}`;
            }

            return output;
        }
    );
}
