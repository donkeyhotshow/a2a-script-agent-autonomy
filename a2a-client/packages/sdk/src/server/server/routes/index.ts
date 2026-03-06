/**
 * Routes Module
 * 
 * Main routes configuration and setup.
 * Separated from main index.ts to improve maintainability and testability.
 */

import {Router} from 'express';
import {AuthenticatedRequest, authMiddleware, sessionMiddleware} from '../middleware/auth.js';
import {configRoutes} from './config.js';
import sessionsRoutes from './sessions.js';

export interface RouteOptions {
    prefix?: string;
    enableAuth?: boolean;
    enableSessionValidation?: boolean;
}

/**
 * Main routes configuration
 */
export function setupRoutes(options: RouteOptions = {}): Router {
    const router = Router();
    const {prefix = '/api/v1', enableAuth = true, enableSessionValidation = true} = options;

    // Apply global middleware if enabled
    if (enableAuth) {
        router.use(authMiddleware);
    }

    if (enableSessionValidation) {
        router.use(sessionMiddleware);
    }

    // Mount stable modules
    router.use(`${prefix}/config`, configRoutes);
    router.use(`${prefix}/sessions`, sessionsRoutes);
    // Also mount at /api/sessions for direct access (matches API info)
    router.use('/api/sessions', sessionsRoutes);

    // Health check endpoint (bypasses auth)
    router.get('/health', (req, res) => {
        res.json({
            status: 'ok',
            service: 'a2a-client-api',
            timestamp: new Date().toISOString()
        });
    });

    // API info endpoint (bypasses auth)
    router.get('/api', (req, res) => {
        res.json({
            service: 'a2a-client-api',
            version: '1.0.0',
            endpoints: {
                config: '/api/config',
                projects: '/api/projects',
                sessions: '/api/sessions',
                terminal: '/api/terminal',
                fs: '/api/fs',
                rag: '/api/rag',
                files: '/api/files',
                ws: '/api/ws'
            },
            timestamp: new Date().toISOString()
        });
    });

    // 404 handler
    router.use('*', (req: AuthenticatedRequest, res) => {
        res.status(404).json({
            error: 'Endpoint not found',
            code: 'NOT_FOUND',
            path: req.path,
            method: req.method,
            sessionId: req.user?.sessionId,
            timestamp: new Date().toISOString()
        });
    });

    return router;
}

// Export individual route modules for testing
export {
    configRoutes,
    sessionsRoutes
};
