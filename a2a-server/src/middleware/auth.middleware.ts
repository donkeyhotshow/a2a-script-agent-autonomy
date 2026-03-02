import {Request, Response, NextFunction} from 'express';
import {unauthorized} from '../errors/http-errors.js';

declare global {
    namespace Express {
        interface Request {
            client?: { id: string; email: string };
        }
    }
}

// Hardcoded password for server access
const SERVER_PASSWORD = process.env['A2A_SERVER_PASSWORD'] || 'a2a_dev_password';

/**
 * Simple password-based authentication
 * Password is hardcoded in client
 */
export async function authenticate(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Skip auth in development if SKIP_AUTH is set
        if (process.env['SKIP_AUTH'] === '1' || process.env['NODE_ENV'] === 'development') {
            req.client = {id: 'dev-client', email: 'dev@a2a.local'};
            return next();
        }

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            throw unauthorized('AUTH_001', 'Authorization header required');
        }

        // Expect: Basic base64(email:password) or Bearer password
        if (authHeader.startsWith('Basic ')) {
            const base64Credentials = authHeader.slice(6);
            const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
            const [email, password] = credentials.split(':');

            if (password === SERVER_PASSWORD && email) {
                req.client = {id: 'client', email};
                return next();
            }
        } else if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            if (token === SERVER_PASSWORD) {
                req.client = {id: 'client', email: 'client@a2a.local'};
                return next();
            }
        }

        throw unauthorized('AUTH_002', 'Invalid credentials');
    } catch (error) {
        next(error);
    }
}

/**
 * Optional authentication - doesn't fail if no auth
 */
export async function optionalAuth(
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (process.env['SKIP_AUTH'] === '1' || process.env['NODE_ENV'] === 'development') {
            req.client = {id: 'dev-client', email: 'dev@a2a.local'};
            return next();
        }

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return next();
        }

        if (authHeader.startsWith('Basic ')) {
            const base64Credentials = authHeader.slice(6);
            const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
            const [email, password] = credentials.split(':');

            if (password === SERVER_PASSWORD && email) {
                req.client = {id: 'client', email};
            }
        } else if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            if (token === SERVER_PASSWORD) {
                req.client = {id: 'client', email: 'client@a2a.local'};
            }
        }

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Require authenticated client
 */
export function requireAuth(
    req: Request,
    _res: Response,
    next: NextFunction
): void {
    if (!req.client) {
        throw unauthorized('AUTH_001', 'Authentication required');
    }

    next();
}

/**
 * Check resource ownership (no-op in stateless mode)
 */
export function requireOwnership(_getResourceClientId: (req: Request) => Promise<string>) {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        // In stateless mode, we don't have resources to check ownership of
        // Just require authentication
        if (!req.client) {
            throw unauthorized('AUTH_001', 'Authentication required');
        }
        next();
    };
}

/**
 * Rate limit by client ID (placeholder)
 */
export function rateLimitByClient(
    _maxRequests: number,
    _windowMs: number
) {
    return async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
        // Pass-through: rate limiting not yet implemented
        next();
    };
}
