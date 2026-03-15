/**
 * Requests API - status and result endpoints
 * GET /requests/:promiseId/status - single status
 * GET /requests/:promiseId/result - single result
 * GET /requests/status?ids=id1,id2,id3 - batch status for multiple promiseIds
 */

import {Router, Request, Response, NextFunction} from 'express';
import {requestService} from '../services/core/request/request.service.js';

const router = Router();

/**
 * Filter out extra fields from response before sending to client.
 * Keep only: execute.message, execute.form, context.task, context.execution, context.history
 */
function filterResponse(result: Record<string, unknown>): Record<string, unknown> {
    const filtered: Record<string, unknown> = {};
    
    // Copy top-level fields (except timestamp)
    if (result.execute !== undefined) {
        filtered.execute = result.execute;
    }
    if (result.context !== undefined) {
        const ctx = result.context as Record<string, unknown>;
        const filteredContext: Record<string, unknown> = {};
        
        // Keep only allowed context fields
        if (ctx.task !== undefined) {
            filteredContext.task = ctx.task;
        }
        if (ctx.execution !== undefined) {
            filteredContext.execution = ctx.execution;
        }
        if (ctx.history !== undefined) {
            filteredContext.history = ctx.history;
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
        
        // Filter response to remove extra fields
        let responseData: Record<string, unknown>;
        
        if (fullResult.result) {
            // fullResult.result contains the ProcessResult from processor
            responseData = filterResponse(fullResult.result as Record<string, unknown>);
        } else if (fullResult.error) {
            // Return error as-is
            responseData = { error: fullResult.error };
        } else {
            responseData = {};
        }
        
        res.json({success: true, data: responseData});
    } catch (error) {
        next(error);
    }
});

export default router;
