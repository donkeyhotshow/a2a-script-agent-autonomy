/**
 * Registry authentication middleware
 *
 * Checks for shared registry token in X-Registry-Token header
 * Skips if SKIP_AUTH is enabled
 */

import type {Request, Response, NextFunction} from 'express';
import {config} from '../config/index.js';

export function registryAuth(req: Request, res: Response, next: NextFunction): void {
    if (config.skipAuth) {
        return next();
    }

    const token = req.headers['x-registry-token'];
    if (!token || typeof token !== 'string') {
        res.status(401).json({
            success: false,
            error: 'Registry token required (X-Registry-Token header)'
        });
        return;
    }

    if (!config.registryToken) {
        res.status(500).json({
            success: false,
            error: 'Registry authentication not configured'
        });
        return;
    }

    if (token !== config.registryToken) {
        res.status(401).json({
            success: false,
            error: 'Invalid registry token'
        });
        return;
    }

    next();
}