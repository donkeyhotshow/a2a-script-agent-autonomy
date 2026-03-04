/**
 * Authentication Middleware
 * 
 * Handles authentication and authorization for API endpoints.
 * Separated from main index.ts to improve maintainability and testability.
 */

import {Request, Response, NextFunction} from 'express';
import {config} from '../../config/index.js';

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        sessionId: string;
    };
}

/**
 * Authentication middleware options
 */
export interface AuthOptions {
    required?: boolean;
    allowAnonymous?: boolean;
    skipAuth?: boolean;
}

/**
 * Authentication middleware factory
 */
export function createAuthMiddleware(options: AuthOptions = {}): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
    const {required = true, allowAnonymous = false, skipAuth = false} = options;

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        // Skip authentication if explicitly disabled
        if (skipAuth || config.skipAuth) {
            req.user = { id: 'anonymous', sessionId: req.headers['x-session-id'] as string || 'anonymous' };
            return next();
        }

        // Extract session ID from headers
        const sessionId = req.headers['x-session-id'] as string;
        
        if (!sessionId) {
            if (allowAnonymous) {
                req.user = { id: 'anonymous', sessionId: 'anonymous' };
                return next();
            }
            
            if (required) {
                return res.status(401).json({ 
                    error: 'Session ID required',
                    code: 'MISSING_SESSION_ID'
                });
            }
        }

        // Validate session ID format
        if (sessionId && !isValidSessionId(sessionId)) {
            return res.status(400).json({ 
                error: 'Invalid session ID format',
                code: 'INVALID_SESSION_ID'
            });
        }

        // Set user context
        req.user = {
            id: 'authenticated',
            sessionId: sessionId || 'anonymous'
        };

        next();
    };
}

/**
 * Session validation middleware
 */
export function validateSession(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const sessionId = req.user?.sessionId;
    
    if (!sessionId || sessionId === 'anonymous') {
        return res.status(401).json({
            error: 'Valid session required',
            code: 'INVALID_SESSION'
        });
    }

    next();
}

/**
 * Project access middleware
 */
export function requireProjectAccess(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
    
    if (!projectId) {
        return res.status(400).json({
            error: 'Project ID required',
            code: 'MISSING_PROJECT_ID'
        });
    }

    // TODO: Implement project access validation
    // This would check if the user has access to the specified project
    next();
}

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(options: {
    windowMs: number;
    max: number;
    message?: string;
} = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
}): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
    
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        const key = req.user?.sessionId || req.ip || 'anonymous';
        const now = Date.now();
        const windowStart = Math.floor(now / options.windowMs) * options.windowMs;

        if (!requests.has(key)) {
            requests.set(key, { count: 0, resetTime: windowStart + options.windowMs });
        }

        const requestInfo = requests.get(key)!;

        // Reset counter if window has passed
        if (now > requestInfo.resetTime) {
            requestInfo.count = 0;
            requestInfo.resetTime = windowStart + options.windowMs;
        }

        requestInfo.count++;

        // Check if limit exceeded
        if (requestInfo.count > options.max) {
            return res.status(429).json({
                error: options.message,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil((requestInfo.resetTime - now) / 1000)
            });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', options.max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - requestInfo.count));
        res.setHeader('X-RateLimit-Reset', new Date(requestInfo.resetTime).toISOString());

        next();
    };
}

/**
 * CORS middleware with session support
 */
export function createCORSWithSessionMiddleware(allowedOrigins: string[] = ['http://localhost:5173']): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction): void => {
        const origin = req.headers.origin;
        
        // Allow requests from allowed origins
        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);
        }

        // Always allow localhost for development
        if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
            res.setHeader('Access-Control-Allow-Origin', origin || '*');
        }

        // Allow credentials
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        
        // Allow specific headers
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-Id');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        next();
    };
}

/**
 * Request logging middleware
 */
export function createRequestLoggerMiddleware(options: {
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
    includeBody?: boolean;
    includeHeaders?: boolean;
} = {}): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
    
    const {logLevel = 'info', includeBody = false, includeHeaders = false} = options;

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        const startTime = Date.now();
        
        // Log request
        const logData = {
            method: req.method,
            path: req.path,
            query: req.query,
            sessionId: req.user?.sessionId,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString()
        };

        if (includeHeaders) {
            logData.headers = req.headers;
        }

        if (includeBody && req.body) {
            logData.body = req.body;
        }

        console.log(`[${logLevel.toUpperCase()}] ${req.method} ${req.path}`, logData);

        // Log response
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const logLevel = res.statusCode >= 400 ? 'error' : 'info';
            
            console.log(`[${logLevel.toUpperCase()}] ${res.statusCode} ${req.method} ${req.path} - ${duration}ms`);
        });

        next();
    };
}

/**
 * Error handling middleware
 */
export function createErrorHandlingMiddleware(options: {
    includeStack?: boolean;
    logErrors?: boolean;
} = {}): (err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
    
    const {includeStack = false, logErrors = true} = options;

    return (err: Error, req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        if (logErrors) {
            console.error('[ERROR]', {
                message: err.message,
                stack: err.stack,
                sessionId: req.user?.sessionId,
                path: req.path,
                method: req.method,
                timestamp: new Date().toISOString()
            });
        }

        // Don't send error details in production
        const errorResponse = {
            error: err.message || 'Internal server error',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString()
        };

        if (includeStack) {
            errorResponse.stack = err.stack;
        }

        res.status(500).json(errorResponse);
    };
}

/**
 * Validation middleware
 */
export function validateRequest(schema: any): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
        try {
            // TODO: Implement request validation using schema
            // This would use a validation library like Joi or Zod
            next();
        } catch (error) {
            return res.status(400).json({
                error: 'Invalid request data',
                code: 'VALIDATION_ERROR',
                details: error.message
            });
        }
    };
}

/**
 * Helper function to validate session ID format
 */
function isValidSessionId(sessionId: string): boolean {
    // Simple validation - session ID should be a valid string
    return typeof sessionId === 'string' && sessionId.length > 0 && sessionId.length < 100;
}

// Export default middleware instances
export const authMiddleware = createAuthMiddleware();
export const sessionMiddleware = validateSession;
export const projectMiddleware = requireProjectAccess;
export const rateLimitMiddleware = createRateLimitMiddleware();
export const corsMiddleware = createCORSWithSessionMiddleware();
export const loggerMiddleware = createRequestLoggerMiddleware();
export const errorMiddleware = createErrorHandlingMiddleware();