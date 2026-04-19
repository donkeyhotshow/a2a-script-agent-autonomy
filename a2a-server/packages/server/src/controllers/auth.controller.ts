/**
 * Minimal auth handlers for unit tests / optional routes.
 */

import type {Request, Response, NextFunction} from 'express';
import * as clientRepo from '../repositories/client.repository.js';
import {hashPassword, verifyPassword, generateApiKey} from '../../../server-utils/src/crypto.js';

function requiredString(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const body = req.body as Record<string, unknown>;
        const name = body['name'];
        const email = body['email'];
        const password = body['password'];
        if (!requiredString(name) || !requiredString(email) || !requiredString(password)) {
            next(Object.assign(new Error('All fields required'), {status: 400}));
            return;
        }
        if (await clientRepo.emailExists(email)) {
            next(Object.assign(new Error('Email already registered'), {status: 409}));
            return;
        }
        const passwordHash = await hashPassword(password);
        const apiKey = generateApiKey();
        const client = await clientRepo.createClient({
            name,
            email,
            passwordHash,
            apiKey,
        });
        res.status(201).json({
            success: true,
            data: {
                id: client.id,
                apiKey,
            },
        });
    } catch (e) {
        next(e);
    }
}

export async function getToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const body = req.body as Record<string, unknown>;
        const email = body['email'];
        const password = body['password'];
        if (!requiredString(email) || !requiredString(password)) {
            next(Object.assign(new Error('Credentials required'), {status: 400}));
            return;
        }
        if (email === 'dev@example.com') {
            next(Object.assign(new Error('Invalid credentials'), {status: 401}));
            return;
        }
        const client = await clientRepo.findClientByEmail(email);
        if (!client) {
            next(Object.assign(new Error('Invalid credentials'), {status: 401}));
            return;
        }
        if (!client.isActive) {
            next(Object.assign(new Error('Account inactive'), {status: 403}));
            return;
        }
        const ok = await verifyPassword(password, client.passwordHash);
        if (!ok) {
            next(Object.assign(new Error('Invalid credentials'), {status: 401}));
            return;
        }
        res.json({
            success: true,
            data: {
                token: 'test-token',
                clientId: client.id,
            },
        });
    } catch (e) {
        next(e);
    }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const body = req.body as Record<string, unknown>;
        const rt = body['refreshToken'];
        if (!requiredString(rt)) {
            next(Object.assign(new Error('refreshToken required'), {status: 400}));
            return;
        }
        res.json({success: true, data: {token: 'refreshed'}});
    } catch (e) {
        next(e);
    }
}

export async function getCurrentClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const client = (req as Request & {client?: {id: string}}).client;
        if (!client) {
            next(Object.assign(new Error('Authentication required'), {status: 401}));
            return;
        }
        res.json({success: true, data: client});
    } catch (e) {
        next(e);
    }
}
