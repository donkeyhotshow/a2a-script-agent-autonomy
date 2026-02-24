import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { invoke } from '../services/invoke.service.js';

// Import new routes
import sessionsRoutes from './sessions.routes.js';
import requestsRoutes from './requests.routes.js';
import actionsRoutes from './actions.routes.js';
import tasksRoutes from './tasks.routes.js';
import projectsRoutes from './projects.routes.js';

/**
 * a2a-server: async protocol with sessions and requests.
 * Accepts markdown + context + optional code blocks.
 */
const router = Router();

// Mount session routes
router.use('/sessions', sessionsRoutes);

// Mount request routes  
router.use('/requests', requestsRoutes);

// Mount actions routes
router.use('/actions', actionsRoutes);

// Mount tasks and projects (stubs - see plans)
router.use('/tasks', tasksRoutes);
router.use('/projects', projectsRoutes);

async function handleInvoke(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as { context?: unknown; message?: string; code_blocks?: unknown };
    const clientId = (req as any).client?.id || 'anonymous';
    const { promiseId } = await invoke(clientId, {
      context: body.context,
      message: body.message,
      code_blocks: body.code_blocks as { path: string; content?: string }[] | undefined,
    });
    res.status(201).json({
      success: true,
      data: {
        promiseId,
        status: 'pending',
        message: 'Request queued for processing. Poll /api/v1/requests/:promiseId/status for status.',
      },
    });
  } catch (error) {
    next(error);
  }
}

router.post('/invoke', authenticate, handleInvoke);

// Health check - no auth required
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      mode: 'async',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
