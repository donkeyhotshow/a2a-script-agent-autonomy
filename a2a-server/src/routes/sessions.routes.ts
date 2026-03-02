import {Router} from 'express';
import * as sessionsController from '../controllers/sessions.controller.js';
import {validateBody, validateParams} from '../middleware/validate.middleware.js';
import {z} from 'zod';

const router = Router();

// Validation schemas
const createSessionSchema = z.object({
    title: z.string().optional(),
});

const sessionIdSchema = z.object({
    id: z.string().min(1, 'Session ID is required'),
});

const addMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system'], {
        errorMap: () => ({message: "Role must be 'user', 'assistant', or 'system'"}),
    }),
    content: z.string().min(1, 'Content is required'),
});

const addSequenceSchema = z.object({
    request: z.any().refine((val) => val !== undefined, {
        message: 'request is required',
    }),
    response: z.any().refine((val) => val !== undefined, {
        message: 'response is required',
    }),
});

/**
 * Sessions API Routes
 * CRUD operations for session management
 */

// POST /api/sessions - Create a new session
router.post('/', validateBody(createSessionSchema), sessionsController.createSession);

// GET /api/sessions - Get all sessions
router.get('/', sessionsController.getAllSessions);

// GET /api/sessions/:id - Get session by ID
router.get('/:id', validateParams(sessionIdSchema), sessionsController.getSessionById);

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', validateParams(sessionIdSchema), sessionsController.deleteSession);

// POST /api/sessions/:id/message - Add message to dialog
router.post(
    '/:id/message',
    validateParams(sessionIdSchema),
    validateBody(addMessageSchema),
    sessionsController.addMessage
);

// POST /api/sessions/:id/sequence - Add request/response sequence
router.post(
    '/:id/sequence',
    validateParams(sessionIdSchema),
    validateBody(addSequenceSchema),
    sessionsController.addSequence
);

export default router;
