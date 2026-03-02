import {Request, Response, NextFunction} from 'express';
import {AppError} from '../types/errors.js';
import * as authService from '../services/auth.service.js';
import {loginInputSchema, refreshTokenInputSchema} from '../utils/validation.js';

/**
 * Auth Controller
 * Thin layer: delegates to auth.service only.
 */

export async function register(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const {name, email, password} = req.body as { name?: string; email?: string; password?: string };
        if (!name || !email || !password) {
            throw new AppError('VALIDATION_001', 'name, email and password required', 400);
        }
        const data = await authService.register({name, email, password});
        res.status(201).json({success: true, data});
    } catch (error) {
        next(error);
    }
}

export async function getToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const apiKey = req.headers['x-api-key'] as string | undefined;
        if (apiKey) {
            const data = await authService.getTokenByApiKey(apiKey);
            if (!data) throw new AppError('AUTH_001', 'Invalid API key', 401);
            res.json({success: true, data});
            return;
        }
        const {email, password} = loginInputSchema.parse(req.body);
        const data = await authService.getTokenByCredentials(email, password);
        if (!data) throw new AppError('AUTH_001', 'Invalid credentials', 401);
        res.json({success: true, data});
    } catch (error) {
        next(error);
    }
}

export async function refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const {refreshToken: token} = refreshTokenInputSchema.parse(req.body);
        const data = await authService.refreshToken(token);
        res.json({success: true, data});
    } catch (error) {
        next(error);
    }
}

export async function getCurrentClient(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        if (!req.client) throw new AppError('AUTH_001', 'Authentication required', 401);
        const data = await authService.getClientById(req.client.id);
        if (!data) throw new AppError('AUTH_001', 'Client not found', 401);
        res.json({success: true, data});
    } catch (error) {
        next(error);
    }
}
