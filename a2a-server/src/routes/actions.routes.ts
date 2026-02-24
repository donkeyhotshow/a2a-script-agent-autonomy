import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { actionService } from '../actions/action-service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * GET /api/v1/actions/:actionId
 * Retrieve action definition by ID
 */
router.get('/:actionId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { actionId } = req.params;

    const action = actionService.getAction(actionId);
    if (!action) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Action not found' },
      });
    }

    res.json({
      success: true,
      data: {
        id: action.id,
        title: action.title,
        description: action.description,
        priority: action.priority,
        subActions: action.subActions.map((subAction) => subAction.id),
      },
    });
  } catch (error) {
    logger.error('Get action failed', { error: String(error) });
    next(error);
  }
});

/**
 * GET /api/v1/actions/search?q=
 * Search actions by task description
 */
router.get('/search', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'q query parameter is required' },
      });
    }

    const matches = actionService.findActions(query);

    res.json({
      success: true,
      data: {
        query,
        actions: matches.map((match) => ({
          id: match.action.id,
          title: match.action.title,
          description: match.action.description,
          priority: match.action.priority,
          matchScore: match.matchScore,
        })),
      },
    });
  } catch (error) {
    logger.error('Search actions failed', { error: String(error) });
    next(error);
  }
});

export default router;

