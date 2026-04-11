/**
 * POST /api/registry/route
 *
 * Routes a task to the best available agent matching the requested capabilities.
 *
 * Request body: { caps: string[] }
 * Response 200: RouteDecision
 * Response 503: no healthy agent available
 */

import { Router, Request, Response } from 'express';
import { agentRegistry } from '../../services/registry-v2';
import { logger } from "@a2a/server-utils/logger";

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const caps: unknown = (req.body as Record<string, unknown>)['caps'];

  if (!Array.isArray(caps)) {
    res.status(400).json({ success: false, error: 'caps must be an array' });
    return;
  }

  const decision = agentRegistry.routeTask(caps as string[]);

  if (!decision) {
    logger.warn('[registry/route] No healthy agent available', { caps });
    res.status(503).json({
      success: false,
      error: 'No healthy agent available for the requested capabilities',
      caps,
    });
    return;
  }

  // Increment load counter for the selected agent
  agentRegistry.incrementLoad(decision.agentId);

  logger.info('[registry/route] Routed task', {
    agentId: decision.agentId,
    caps,
    reason: decision.reason,
  });

  res.status(200).json({ success: true, ...decision });
});

export default router;
