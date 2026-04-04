import {Router, Request, Response, NextFunction} from 'express';
import Ajv from 'ajv';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {invoke} from '../services/utils/invoke.service.js';
import requestsRouter from './requests.routes.js';
import type { FileBlock } from '../types/index.js';

const ajv = new (Ajv as any)({strict: false, allErrors: true, validateFormats: false});

const router = Router();

// Mount requests API (status, result, batch status)
router.use('/requests', requestsRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_INVOKE_REQUEST_SCHEMA_PATH = join(
    __dirname,
    '../../../docs/new-request-flow/json-schemas/server-invoke-request.schema.json'
);

let validateInvokeRequestBody: ((data: unknown) => boolean) | null = null;
try {
    const schema = JSON.parse(readFileSync(SERVER_INVOKE_REQUEST_SCHEMA_PATH, 'utf-8'));
    validateInvokeRequestBody = ajv.compile(schema);
} catch (err) {
    // If schemas are missing in a dev checkout, keep previous behavior rather than crash.
    console.warn('[invoke route] Failed to compile server-invoke-request.schema.json', err);
}

function validateInvokeRequest(body: unknown): { valid: boolean; errors?: string[] } {
    if (!validateInvokeRequestBody) return { valid: true };
    const ok = validateInvokeRequestBody(body);
    if (ok) return {valid: true};
    const e = (validateInvokeRequestBody as any).errors as Array<{message?: string}> | null | undefined;
    return {
        valid: false,
        errors: (e ?? [])
            .map((x) => x.message)
            .filter(Boolean) as string[],
    };
}

/**
 * Main invoke endpoint - all processing happens here
 */
router.post('/invoke', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const body = req.body as {
            task?: string;
            context?: unknown;
            message?: string;
            code_blocks?: unknown;
            result?: unknown;
            action?: string;
            selectedAction?: { actionId: string };
            stepId?: string;
            stepResult?: unknown;
            sync?: boolean;
        };

        const validation = validateInvokeRequest(body);
        if (!validation.valid) {
            res.status(400).json({
                success: false,
                error: {
                    message: 'Invalid /api/v1/invoke request body',
                    details: validation.errors ?? [],
                }
            });
            return;
        }
        
        const clientId = 'anonymous';
        const resultKeys = body.result && typeof body.result === 'object' ? Object.keys(body.result) : [];
        console.log('[a2a-server] /invoke received', { resultKeys, task: body.task?.slice(0, 50) });
        
        const invokeResult = await invoke(clientId, {
            task: body.task,
            context: body.context,
            message: body.message,
            code_blocks: body.code_blocks as FileBlock[] | undefined,
            action: body.action,
            selectedAction: body.selectedAction,
            stepId: body.stepId,
            stepResult: body.stepResult,
            result: body.result as Record<string, unknown> | undefined,
            sync: body.sync,
        });

        // Sync chain timed out or could not attach a terminal payload — must poll by promiseId, not empty sync JSON.
        const pid = invokeResult.promiseId;
        const incomplete =
            typeof pid === 'string' &&
            pid.length > 0 &&
            invokeResult.execute === undefined &&
            invokeResult.message === undefined &&
            invokeResult.context === undefined;
        if (incomplete) {
            res.json({
                success: true,
                data: {
                    promiseId: pid,
                    status: 'pending',
                    pollUrl: `/requests/${pid}`,
                }
            });
            return;
        }

        // Synchronous response
        if (invokeResult.sync || body.sync) {
            res.json({
                success: true,
                data: {
                    sync: true,
                    execute: invokeResult.execute,
                    message: invokeResult.message,
                    context: invokeResult.context,
                }
            });
            return;
        }

        // Async response with promiseId
        console.log('[a2a-server] /invoke returning promiseId', { promiseId: invokeResult.promiseId });
        res.json({
            success: true,
            data: {
                promiseId: invokeResult.promiseId,
                status: 'pending',
                pollUrl: `/requests/${invokeResult.promiseId}`,
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Health check - minimal
 */
router.get('/health', (_req: Request, res: Response): void => {
    res.json({status: 'ok', mode: 'stateless'});
});

export default router;
