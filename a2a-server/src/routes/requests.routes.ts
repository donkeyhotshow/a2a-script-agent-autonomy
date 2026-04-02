/**
 * Requests API - status and result endpoints
 * GET /requests/:promiseId/status - single status
 * GET /requests/:promiseId/result - single result
 * GET /requests/status?ids=id1,id2,id3 - batch status for multiple promiseIds
 */

import {Router, Request, Response, NextFunction} from 'express';
import {requestService} from '../services/core/request/request.service.js';
import {
    getPendingManualLlm,
    removePendingManualLlm,
    listPendingManualLlms,
} from '../services/core/request/manual-llm.service.js';
import {GrayRoomOrchestrator, readGrayRoomInterruptBudget} from '../services/core/request-processor/gray-room-orchestrator.js';
import {getPromptsTransformsPath} from '../transform/index.js';

const router = Router();

/** Context fields preserved on GET /requests/:id/result (align with simulations/SCHEMA.md). */
const POLL_CONTEXT_KEYS = [
    'task',
    'execution',
    'history',
    'workbench',
    'files',
    'scratchpad',
    'scratchpad_ops',
] as const;

/**
 * Filter extra top-level noise but keep full protocol execute + canonical context
 * (workbench, files, scratchpad) so pollers match Client API / goldens.
 */
export function filterResponse(result: Record<string, unknown>): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};

    if (result.execute !== undefined) {
        filtered.execute = result.execute;
    }
    if (result.context !== undefined) {
        const ctx = result.context as Record<string, unknown>;
        const filteredContext: Record<string, unknown> = {};

        for (const key of POLL_CONTEXT_KEYS) {
            if (ctx[key] !== undefined) {
                filteredContext[key] = ctx[key];
            }
        }

        filtered.context = filteredContext;
    }

    return filtered;
}

/**
 * GET /requests/status?ids=id1,id2,id3
 * Batch status for multiple promiseIds. Client can poll several sessions in one request.
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const idsParam = req.query.ids;
        if (!idsParam || typeof idsParam !== 'string') {
            res.status(400).json({
                success: false,
                error: {message: 'Query param "ids" required (comma-separated promiseIds)'},
            });
            return;
        }
        const promiseIds = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
        if (promiseIds.length === 0) {
            res.status(400).json({
                success: false,
                error: {message: 'At least one promiseId required in ids'},
            });
            return;
        }
        if (promiseIds.length > 50) {
            res.status(400).json({
                success: false,
                error: {message: 'Max 50 promiseIds per request'},
            });
            return;
        }

        const results = await requestService.getStatusBatch(promiseIds);
        const items = results.map((r, i) =>
            r ? {...r, found: true} : {promiseId: promiseIds[i], found: false}
        );

        res.json({
            success: true,
            data: {items},
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /requests/manual-llm/pending
 * List all requests waiting for manual LLM input (must be before /:promiseId/*).
 */
router.get('/manual-llm/pending', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const pending = listPendingManualLlms();
        res.json({
            success: true,
            data: {
                count: pending.length,
                items: pending,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /requests/:promiseId/status
 * Single status (existing behavior)
 */
router.get('/:promiseId/status', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const promiseId = String(req.params.promiseId || '');
        const status = await requestService.getStatus(promiseId);
        if (!status) {
            res.status(404).json({
                success: false,
                error: {message: 'Request not found'},
            });
            return;
        }
        res.json({success: true, data: status});
    } catch (error) {
        next(error);
    }
});

/**
 * GET /requests/:promiseId/result
 * Full result (when status is completed/failed)
 */
router.get('/:promiseId/result', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const promiseId = String(req.params.promiseId || '');
        const fullResult = await requestService.getResult(promiseId);
        if (!fullResult) {
            res.status(404).json({
                success: false,
                error: {message: 'Request not found'},
            });
            return;
        }

        // Always expose request status so pollers see terminal failed/pending (not empty {}).
        const responseData: Record<string, unknown> = {
            status: fullResult.status,
        };

        if (fullResult.result) {
            Object.assign(responseData, filterResponse(fullResult.result as Record<string, unknown>));
        }

        if (fullResult.error) {
            responseData.error = fullResult.error;
        }

        if (
            (fullResult.status === 'failed' || fullResult.status === 'cancelled') &&
            responseData.error === undefined
        ) {
            const r = fullResult.result as Record<string, unknown> | null | undefined;
            const msg = r?.error ?? r?.message;
            if (msg !== undefined) {
                responseData.error = typeof msg === 'string' ? {message: msg} : msg;
            }
        }

        // Add manual LLM mode indicator if applicable
        if (fullResult.status === 'waiting_manual_llm') {
            responseData.manualLlmMode = true;
            responseData.message = `🛑 MANUAL LLM MODE — Submit response via POST /requests/${promiseId}/llm-response`;
        }

        res.json({success: true, data: responseData});
    } catch (error) {
        next(error);
    }
});

/**
 * POST /requests/:promiseId/llm-response
 * Submit manual LLM response for a request in waiting_manual_llm state
 */
router.post('/:promiseId/llm-response', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const promiseId = String(req.params.promiseId || '');
        const {response} = req.body || {};

        if (typeof response !== 'string' || response.trim() === '') {
            res.status(400).json({
                success: false,
                error: {message: 'Missing required field: response (string)'},
            });
            return;
        }

        // Check if there's a pending manual LLM request
        const pending = getPendingManualLlm(promiseId);
        if (!pending) {
            // Check request status
            const reqStatus = await requestService.getResult(promiseId);
            if (!reqStatus) {
                res.status(404).json({
                    success: false,
                    error: {message: 'Request not found'},
                });
                return;
            }
            if (reqStatus.status !== 'waiting_manual_llm') {
                res.status(400).json({
                    success: false,
                    error: {message: `Request is not in waiting_manual_llm state (current: ${reqStatus.status})`},
                });
                return;
            }
            res.status(400).json({
                success: false,
                error: {message: 'No pending manual LLM data found for this request'},
            });
            return;
        }

        // Remove from pending
        removePendingManualLlm(promiseId);

        // Process the response through gray room
        const grayRoom = new GrayRoomOrchestrator({
            promptsTransformsPath: getPromptsTransformsPath(),
            maxInterruptTurns: readGrayRoomInterruptBudget(),
        });

        const result = await grayRoom.runLoop(
            pending.ctxSnapshot,
            pending.schemaName,
            response.trim(),
            promiseId,
            false,
            true // gray room enabled for manual mode too
        );

        // Update request with result
        await requestService.updateStatus(
            promiseId,
            result.outcome === 'failed' ? 'failed' : 'completed',
            result as unknown as Record<string, unknown>
        );

        res.json({
            success: true,
            data: {
                promiseId,
                status: result.outcome === 'failed' ? 'failed' : 'completed',
                note: 'Manual LLM response processed',
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
