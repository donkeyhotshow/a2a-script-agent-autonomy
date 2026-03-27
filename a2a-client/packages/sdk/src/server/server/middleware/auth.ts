/**
 * Authentication Middleware
 * 
 * Handles authentication and authorization for API endpoints.
 * Separated from main index.ts to improve maintainability and testability.
 */

import {Request, Response, NextFunction} from 'express';
import crypto from 'crypto';
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
 * Decode and verify JWT token
 * JWT format: header.payload.signature (all base64url encoded)
 * Returns payload if valid, null if invalid
 */
function decodeAndVerifyJwt(token: string, secret: string): {sessionId: string; userId: string} | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        const [headerB64, payloadB64, signatureB64] = parts;

        // Decode header to verify algorithm
        const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
        if (header.alg !== 'HS256') {
            return null;
        }

        // Verify signature
        const signingInput = `${headerB64}.${payloadB64}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(signingInput, 'utf8')
            .digest('base64url');

        if (expectedSignature !== signatureB64) {
            return null;
        }

        // Decode payload
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));

        // Validate required fields
        if (!payload.sessionId || !payload.userId) {
            return null;
        }

        // Check expiration if present
        if (payload.exp && Date.now() > payload.exp * 1000) {
            return null;
        }

        return {
            sessionId: payload.sessionId,
            userId: payload.userId,
        };
    } catch {
        return null;
    }
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
        // Skip authentication if SKIP_AUTH=1 or explicitly set
        if (skipAuth || config.skipAuth) {
            next();
            return;
        }
        
        // Check if JWT_SECRET is configured
        if (!config.jwtSecret) {
            res.status(500).json({
                success: false,
                error: {
                    code: 'AUTH_CONFIG_ERROR',
                    message: 'JWT_SECRET not configured'
                }
            });
            return;
        }
        
        try {
            // Extract authorization header
            const authHeader = req.headers.authorization;
            
            if (!authHeader) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Authorization header missing'
                    }
                });
                return;
            }

            // Validate Bearer token format
            if (!authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid authorization header format. Expected: Bearer <token>'
                    }
                });
                return;
            }

            const token = authHeader.slice(7); // Remove "Bearer " prefix

            // Verify and decode JWT
            const payload = decodeAndVerifyJwt(token, config.jwtSecret);
            
            if (!payload) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid or expired token'
                    }
                });
                return;
            }

            // Validate session ID if present in request
            const sessionId = req.params.sessionId || req.body?.session_id;
            if (sessionId && sessionId !== payload.sessionId) {
                res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Session ID mismatch'
                    }
                });
                return;
            }

            // Attach user info to request
            (req as AuthenticatedRequest).user = {
                id: payload.userId,
                sessionId: payload.sessionId,
            };
            
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

// Export for routes/index.ts compatibility
export const authMiddleware = createAuthMiddleware();
export const sessionMiddleware = createAuthMiddleware();