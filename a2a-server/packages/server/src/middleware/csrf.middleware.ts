/**
 * CSRF middleware (CWE-352, CWE-1275)
 *
 * Enforces the "custom request header" CSRF mitigation pattern:
 * state-mutating requests (POST/PUT/PATCH/DELETE) must carry either
 * X-Requested-With or X-Registry-Token header.
 *
 * Browsers cannot attach arbitrary custom headers to cross-origin requests
 * without a preflight, so their presence proves the request originated from
 * JavaScript running in an allowed origin — not from a forged form/img/fetch.
 */

import type {Request, Response, NextFunction} from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const hasCustomHeader =
        typeof req.headers['x-requested-with'] === 'string' ||
        typeof req.headers['x-registry-token'] === 'string';

    if (!hasCustomHeader) {
        res.status(403).json({
            success: false,
            error: 'CSRF check failed: X-Requested-With or X-Registry-Token header required',
        });
        return;
    }

    next();
}
