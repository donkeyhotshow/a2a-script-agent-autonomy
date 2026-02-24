import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { invoke } from '../services/invoke.service.js';

// Import new routes
import sessionsRoutes from './sessions.routes.js';
import requestsRoutes from './requests.routes.js';

/**
 * a2a-server: async protocol with sessions and requests.
 * Accepts markdown + context + optional code blocks.
 */
const router = Router();

// Mount session routes
router.use('/sessions', sessionsRoutes);

// Mount request routes  
router.use('/requests', requestsRoutes);

async function handleInvoke(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as { context?: unknown; message?: string; code_blocks?: unknown };
    const clientId = (req as any).client?.id || 'anonymous';
    const codeBlocks = body.code_blocks as { path: string; content: string }[] | undefined;
    const { promiseId } = await invoke(clientId, {
      context: body.context,
      message: body.message,
      code_blocks: codeBlocks?.map(block => ({
        path: block.path,
        content: block.content || '',
      })),
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
router.post('/message', authenticate, handleInvoke);

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
