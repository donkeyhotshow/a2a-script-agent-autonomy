/**
 * Sessions Routes
 * API endpoints for session management
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { sessionService } from '../services/session.service.js';
import { messageService } from '../services/message.service.js';
import { createContext, getContext, handleRoot } from '../services/session-context.service.js';
import type { RootContext } from '../services/session-context.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/v1/sessions
 * Create a new session
 */
router.post('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, title } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'projectId is required' },
      });
    }

    const session = await sessionService.create({
      projectId,
      title,
    });

    createContext(session.id, projectId);

    logger.info('Session created via API', { sessionId: session.id, projectId });

    res.status(201).json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/sessions
 * List sessions for a project
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, status, limit, offset } = req.query;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'projectId is required' },
      });
    }

    const sessions = await sessionService.getByProjectId(projectId as string, {
      status: status as any,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/sessions/:sessionId/root-context
 * Submit root context (activates neurons, returns context + injectedContent)
 */
router.post('/:sessionId/root-context', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const rootContext = req.body as RootContext;

    const dbSession = await sessionService.getById(sessionId);
    if (!dbSession) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    if (!getContext(sessionId)) {
      createContext(sessionId, dbSession.projectId);
    }

    const result = handleRoot(sessionId, rootContext);

    res.json({
      success: true,
      data: {
        context: result.context,
        injectedContent: result.injectedContent,
        activatedNeurons: result.activatedNeurons.map((a) => ({ id: a.neuron.id, name: a.neuron.name })),
        requestedFiles: result.requestedFiles,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/sessions/:sessionId
 * Get session with messages
 */
router.get('/:sessionId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const session = await sessionService.getById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/sessions/:sessionId
 * Update session
 */
router.patch('/:sessionId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { title, status } = req.body;

    const session = await sessionService.update(sessionId, {
      title,
      status,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/sessions/:sessionId
 * Delete session
 */
router.delete('/:sessionId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const deleted = await sessionService.delete(sessionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Session not found' },
      });
    }

    res.json({
      success: true,
      data: { id: sessionId, deleted: true },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/sessions/:sessionId/messages
 * Get messages for a session
 */
router.get('/:sessionId/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { limit, offset } = req.query;

    const messages = await messageService.getBySessionId(sessionId, {
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/sessions/:sessionId/messages
 * Add a message to a session
 */
router.post('/:sessionId/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const { direction, role, content, contentText, promiseId, status } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'content is required' },
      });
    }

    const message = await messageService.create({
      sessionId,
      direction: direction || 'CLIENT_TO_SERVER',
      role: role || 'user',
      content,
      contentText,
      promiseId,
      status,
    });

    logger.info('Message added to session', { sessionId, messageId: message.id });

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
