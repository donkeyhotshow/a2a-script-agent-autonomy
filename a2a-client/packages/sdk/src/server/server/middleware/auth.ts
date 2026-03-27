/**
 * Authentication Middleware
 * 
 * Handles authentication and authorization for API endpoints.
 * Separated from main index.ts to improve maintainability and testability.
 */

import {Request, Response, NextFunction} from 'express';
import {config} from '../../config/index.js';

// Inline validation - matches a2a-client/shared/session-id.js
const SAFE_SEGMENT = /^[a-zA-Z0-9_-]+$/;
const MAX_LEN = 64;

function isValidSessionId(id: string): boolean {
    return typeof id === 'string' && SAFE_SEGMENT.test(id) && id.length <= MAX_LEN;
}

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        sessionId: string;
    };
}

/**
 * Authentication middleware options
 */
export interface AuthMiddlewareOptions {
    skipAuth?: boolean;
}

/**
 * Create authentication middleware
 * 
 * @param options - Middleware options
 * @returns Express middleware function
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
    const { skipAuth = false } = options;
    
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Skip authentication in development mode or if explicitly set
        if (skipAuth || config.nodeEnv === 'development') {
            next();
            return;
        }
        
        try {
            // Extract session ID from request
            const sessionId = req.params.sessionId || req.body.session_id;
            
            // Validate session ID if present
            if (sessionId && !isValidSessionId(sessionId)) {
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_SESSION',
                        message: 'Invalid session ID format'
                    }
                });
                return;
            }
            
            // For now, allow all requests - TODO: Implement proper auth
            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Default auth middleware instance
 */
export default createAuthMiddleware();
