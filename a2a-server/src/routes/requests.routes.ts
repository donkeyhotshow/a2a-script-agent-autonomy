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
        const result = await requestService.getResult(promiseId);
        if (!result) {
            res.status(404).json({
                success: false,
                error: {message: 'Request not found'},
            });
            return;
        }
        res.json({success: true, data: result});
    } catch (error) {
        next(error);
    }
});

export default router;
