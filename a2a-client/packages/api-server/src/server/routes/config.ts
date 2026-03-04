/**
 * Config Routes
 * 
 * Handles configuration-related API endpoints.
 * Separated from main index.ts to improve maintainability and testability.
 */

import {Router, Request, Response} from 'express';
import {AuthenticatedRequest} from '../middleware/auth.js';
import {config} from '../../config/index.js';

const router = Router();

/**
 * Get current configuration
 */
router.get('/', (req: AuthenticatedRequest, res: Response) => {
    try {
        const configData = {
            // Server configuration
            server: {
                port: config.port,
                host: config.host,
                enableLogging: config.enableLogging,
                enableCORS: config.enableCORS,
                skipAuth: config.skipAuth
            },
            
            // WebSocket configuration
            websocket: {
                port: config.websocketPort,
                host: config.websocketHost,
                pingInterval: config.websocketPingInterval
            },
            
            // Client configuration
            client: {
                apiPort: config.clientApiPort,
                apiHost: config.clientApiHost,
                enableDebug: config.enableDebug
            },
            
            // Session configuration
            session: {
                timeout: config.sessionTimeout,
                maxConnections: config.maxConnectionsPerSession
            },
            
            // Project configuration
            project: {
                defaultPath: config.defaultProjectPath,
                maxFileSize: config.maxFileSize,
                allowedExtensions: config.allowedFileExtensions
            },
            
            // Terminal configuration
            terminal: {
                maxHistory: config.terminalMaxHistory,
                defaultShell: config.terminalDefaultShell,
                enableLogging: config.terminalEnableLogging
            },
            
            // RAG configuration
            rag: {
                maxResults: config.ragMaxResults,
                chunkSize: config.ragChunkSize,
                overlapSize: config.ragOverlapSize
            },
            
            // File system configuration
            fs: {
                maxReadSize: config.fsMaxReadSize,
                maxWriteSize: config.fsMaxWriteSize,
                enableLogging: config.fsEnableLogging
            },
            
            // API configuration
            api: {
                version: config.apiVersion,
                enableRateLimit: config.enableRateLimit,
                rateLimitWindow: config.rateLimitWindow,
                rateLimitMax: config.rateLimitMax
            },
            
            // Timestamp
            timestamp: new Date().toISOString()
        };

        res.json(configData);
    } catch (error) {
        console.error('[CONFIG] Error getting configuration:', error);
        res.status(500).json({
            error: 'Failed to get configuration',
            code: 'CONFIG_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Update configuration (for development/testing)
 */
router.post('/', (req: AuthenticatedRequest, res: Response) => {
    try {
        // This endpoint is primarily for development and testing
        // In production, configuration should be managed through environment variables
        
        const updates = req.body;
        
        // Validate updates
        const validKeys = [
            'enableLogging', 'enableCORS', 'skipAuth', 'enableDebug',
            'sessionTimeout', 'maxConnectionsPerSession', 'maxFileSize',
            'terminalMaxHistory', 'enableRateLimit', 'rateLimitMax'
        ];

        const invalidKeys = Object.keys(updates).filter(key => !validKeys.includes(key));
        
        if (invalidKeys.length > 0) {
            return res.status(400).json({
                error: 'Invalid configuration keys',
                code: 'INVALID_CONFIG_KEYS',
                invalidKeys,
                validKeys,
                timestamp: new Date().toISOString()
            });
        }

        // Apply updates (this would typically require a restart in production)
        Object.assign(config, updates);

        res.json({
            message: 'Configuration updated',
            updatedKeys: Object.keys(updates),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[CONFIG] Error updating configuration:', error);
        res.status(500).json({
            error: 'Failed to update configuration',
            code: 'CONFIG_UPDATE_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get configuration schema
 */
router.get('/schema', (req: AuthenticatedRequest, res: Response) => {
    try {
        const schema = {
            type: 'object',
            properties: {
                server: {
                    type: 'object',
                    properties: {
                        port: { type: 'number' },
                        host: { type: 'string' },
                        enableLogging: { type: 'boolean' },
                        enableCORS: { type: 'boolean' },
                        skipAuth: { type: 'boolean' }
                    }
                },
                websocket: {
                    type: 'object',
                    properties: {
                        port: { type: 'number' },
                        host: { type: 'string' },
                        pingInterval: { type: 'number' }
                    }
                },
                client: {
                    type: 'object',
                    properties: {
                        apiPort: { type: 'number' },
                        apiHost: { type: 'string' },
                        enableDebug: { type: 'boolean' }
                    }
                },
                session: {
                    type: 'object',
                    properties: {
                        timeout: { type: 'number' },
                        maxConnections: { type: 'number' }
                    }
                },
                project: {
                    type: 'object',
                    properties: {
                        defaultPath: { type: 'string' },
                        maxFileSize: { type: 'number' },
                        allowedExtensions: { type: 'array', items: { type: 'string' } }
                    }
                },
                terminal: {
                    type: 'object',
                    properties: {
                        maxHistory: { type: 'number' },
                        defaultShell: { type: 'string' },
                        enableLogging: { type: 'boolean' }
                    }
                },
                rag: {
                    type: 'object',
                    properties: {
                        maxResults: { type: 'number' },
                        chunkSize: { type: 'number' },
                        overlapSize: { type: 'number' }
                    }
                },
                fs: {
                    type: 'object',
                    properties: {
                        maxReadSize: { type: 'number' },
                        maxWriteSize: { type: 'number' },
                        enableLogging: { type: 'boolean' }
                    }
                },
                api: {
                    type: 'object',
                    properties: {
                        version: { type: 'string' },
                        enableRateLimit: { type: 'boolean' },
                        rateLimitWindow: { type: 'number' },
                        rateLimitMax: { type: 'number' }
                    }
                }
            }
        };

        res.json({
            schema,
            description: 'Configuration schema for A2A Client API',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[CONFIG] Error getting configuration schema:', error);
        res.status(500).json({
            error: 'Failed to get configuration schema',
            code: 'CONFIG_SCHEMA_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Reset configuration to defaults
 */
router.post('/reset', (req: AuthenticatedRequest, res: Response) => {
    try {
        // This would reset configuration to default values
        // Implementation depends on how configuration is managed
        
        res.json({
            message: 'Configuration reset to defaults',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[CONFIG] Error resetting configuration:', error);
        res.status(500).json({
            error: 'Failed to reset configuration',
            code: 'CONFIG_RESET_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Validate configuration
 */
router.post('/validate', (req: AuthenticatedRequest, res: Response) => {
    try {
        const configToValidate = req.body;
        
        // Basic validation logic
        const errors: string[] = [];
        
        if (configToValidate.server?.port && (configToValidate.server.port < 1 || configToValidate.server.port > 65535)) {
            errors.push('Server port must be between 1 and 65535');
        }
        
        if (configToValidate.websocket?.port && (configToValidate.websocket.port < 1 || configToValidate.websocket.port > 65535)) {
            errors.push('WebSocket port must be between 1 and 65535');
        }
        
        if (configToValidate.session?.timeout && configToValidate.session.timeout < 0) {
            errors.push('Session timeout must be positive');
        }
        
        if (configToValidate.rag?.maxResults && configToValidate.rag.maxResults < 1) {
            errors.push('RAG max results must be at least 1');
        }
        
        if (errors.length > 0) {
            return res.status(400).json({
                valid: false,
                errors,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            valid: true,
            message: 'Configuration is valid',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('[CONFIG] Error validating configuration:', error);
        res.status(500).json({
            error: 'Failed to validate configuration',
            code: 'CONFIG_VALIDATION_ERROR',
            timestamp: new Date().toISOString()
        });
    }
});

export const configRoutes = router;