import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { parseContextBlock } from '../protocol/context-parser.js';
import type { ContextBlock, FileBlock } from '../types/index.js';

/**
 * a2a-server: stateless.
 * Accepts markdown + context + optional code blocks. No projects, sessions, storage.
 */
const router = Router();

// POST /api/v1/invoke - Main endpoint for A2A protocol
// Accepts: { context: ContextBlock, message?: string, code_blocks?: FileBlock[] }
// Returns: { context: ContextBlock, message?: string, code_blocks?: FileBlock[] }
router.post('/invoke', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      context?: unknown;
      message?: string;
      code_blocks?: FileBlock[];
    };

    // Parse and validate context
    let context: ContextBlock;
    if (body.context) {
      context = parseContextBlock(body.context);
    } else {
      // Create default context
      context = {
        version: '1.0' as const,
        session_id: 'stateless',
      };
    }

    const { message, code_blocks: codeBlocks } = body;

    // TODO: Process through ML/knowledge services and return response
    // For now, echo back the received data
    
    res.json({
      success: true,
      data: {
        version: '1.0',
        context,
        message: message ?? 'A2A Server ready',
        code_blocks: codeBlocks,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/message - Alternative endpoint name
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

    res.json({
      success: true,
      data: {
        version: '1.0',
        context,
        message: message ?? 'Message processed',
        code_blocks: codeBlocks,
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
      mode: 'stateless',
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
