import {Request, Response, NextFunction} from 'express';
import {AppError} from '../types/errors.js';
import {notFound} from '../errors/http-errors.js';
import {sessionManager} from '../services/session-manager.service.js';
import type {DialogRole} from '../services/session-manager.service.js';

/**
 * Sessions Controller
 * CRUD operations for session management using SessionManager
 */

/**
 * Create a new session
 * POST /api/sessions
 */
export async function createSession(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const {title} = req.body as { title?: string };
        const metadata = await sessionManager.createSession(title);

        res.status(201).json({
            success: true,
            data: metadata,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get all sessions
 * GET /api/sessions
 */
export async function getAllSessions(
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const sessions = await sessionManager.listSessions();

        res.json({
            success: true,
            data: sessions,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Get session by ID
 * GET /api/sessions/:id
 */
export async function getSessionById(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = req.params['id'] as string;
        if (!id) {
            throw new AppError('VALIDATION_001', 'Session ID is required', 400);
        }

        const session = await sessionManager.getSession(id);

        if (!session) {
            throw notFound('Session');
        }

        res.json({
            success: true,
            data: session,
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Delete session by ID
 * DELETE /api/sessions/:id
 */
export async function deleteSession(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = req.params['id'] as string;
        if (!id) {
            throw new AppError('VALIDATION_001', 'Session ID is required', 400);
        }

        const success = await sessionManager.deleteSession(id);

        if (!success) {
            throw notFound('Session');
        }

        res.json({
            success: true,
            data: {deleted: true},
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Add message to session dialog
 * POST /api/sessions/:id/message
 */
export async function addMessage(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = req.params['id'] as string;
        if (!id) {
            throw new AppError('VALIDATION_001', 'Session ID is required', 400);
        }

        const {role, content} = req.body as { role: string; content: string };

        // Validate role
        const validRoles: DialogRole[] = ['user', 'assistant', 'system'];
        if (!validRoles.includes(role as DialogRole)) {
            throw new AppError(
                'VALIDATION_001',
                `Invalid role. Must be one of: ${validRoles.join(', ')}`,
                400
            );
        }

        if (!content || typeof content !== 'string') {
            throw new AppError('VALIDATION_001', 'content is required and must be a string', 400);
        }

        const success = await sessionManager.addMessage(id, role as DialogRole, content);

        if (!success) {
            throw notFound('Session');
        }

        res.json({
            success: true,
            data: {added: true},
        });
    } catch (error) {
        next(error);
    }
}

/**
 * Add request/response sequence to session
 * POST /api/sessions/:id/sequence
 */
export async function addSequence(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const id = req.params['id'] as string;
        if (!id) {
            throw new AppError('VALIDATION_001', 'Session ID is required', 400);
        }

        const {request, response} = req.body as { request: unknown; response: unknown };

        if (request === undefined) {
            throw new AppError('VALIDATION_001', 'request is required', 400);
        }

        if (response === undefined) {
            throw new AppError('VALIDATION_001', 'response is required', 400);
        }

        const success = await sessionManager.addSequence(id, request, response);

        if (!success) {
            throw notFound('Session');
        }

        res.json({
            success: true,
            data: {added: true},
        });
    } catch (error) {
        next(error);
    }
}
