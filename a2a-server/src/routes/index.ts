import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { parseContextBlock } from '../protocol/context-parser.js';
import type { ContextBlock, FileBlock } from '../types/index.js';

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

// POST /api/v1/invoke - Main endpoint for A2A protocol (legacy, creates request internally)
// Accepts: { context: ContextBlock, message?: string, code_blocks?: FileBlock[] }
// Returns: { promiseId: string } - client should poll for result
router.post('/invoke', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      context?: unknown;
      message?: string;
      code_blocks?: FileBlock[];
    };

    let context: ContextBlock;
    if (body.context) {
      context = parseContextBlock(body.context);
    } else {
      context = {
        version: '1.0' as const,
        session_id: 'stateless',
      };
    }

    const { message, code_blocks: codeBlocks } = body;
    const clientId = (req as any).client?.id || 'anonymous';

    const { requestService } = await import('../services/request.service.js');
    const { promiseId } = await requestService.create({
      clientId,
      context: context as Record<string, unknown>,
      message,
      codeBlocks: codeBlocks ?? undefined,
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
});

// POST /api/v1/message - Alternative endpoint name (legacy)
router.post('/message', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      context?: unknown;
      message?: string;
      code_blocks?: FileBlock[];
    };

    let context: ContextBlock;
    if (body.context) {
      context = parseContextBlock(body.context);
    } else {
      context = {
        version: '1.0' as const,
        session_id: 'stateless',
      };
    }

    const { message, code_blocks: codeBlocks } = body;
    const clientId = (req as any).client?.id || 'anonymous';

    const { requestService } = await import('../services/request.service.js');
    const { promiseId } = await requestService.create({
      clientId,
      context: context as Record<string, unknown>,
      message,
      codeBlocks: codeBlocks ?? undefined,
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
});

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
