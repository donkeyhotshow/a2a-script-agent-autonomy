import {Router} from 'express';
import {getHealthStatus} from '../services/health.service.js';

const router = Router();

/**
 * Health Check Routes
 * Uses health.service (routes → services only).
 */

router.get('/', async (_req, res) => {
    try {
        const status = await getHealthStatus();
        const ok = status.database.status === 'healthy';
        res.json({
            success: true,
            data: {
                status: ok ? 'healthy' : 'degraded',
                database: status.database,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (err) {
        res.status(503).json({
            success: false,
            error: {code: 'HEALTH_ERROR', message: String(err)},
        });
    }
});

router.get('/live', (_req, res) => {
    res.json({success: true, data: {status: 'alive'}});
});

router.get('/ready', async (_req, res) => {
    try {
        const status = await getHealthStatus();
        const ready = status.database.status === 'healthy';
        res.status(ready ? 200 : 503).json({
            success: ready,
            data: {ready, database: status.database},
        });
    } catch (err) {
        res.status(503).json({
            success: false,
            data: {ready: false, error: String(err)},
        });
    }
});

router.get('/database', async (_req, res) => {
    try {
        const status = await getHealthStatus();
        res.json({success: true, data: status.database});
    } catch (err) {
        res.status(503).json({
            success: false,
            error: {code: 'HEALTH_ERROR', message: String(err)},
        });
    }
});

router.get('/sync-flow', (_req, res) => {
    const defaultSyncMode = process.env.DEFAULT_SYNC_MODE === '1';
    const skipAuth = process.env.SKIP_AUTH === '1';

    res.json({
        success: true,
        data: {
            defaultSyncMode,
            skipAuth,
            syncFlowEnabled: true,
            protocolVersion: '1.0',
            supportedActions: [
                'form', 'message', 'script', 'read-file', 'write-file',
                'execute-command', 'rag-search', 'choice'
            ],
            timestamp: new Date().toISOString(),
        },
    });
});

export default router;

