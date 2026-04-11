/**
 * POST /api/registry/register
 *
 * Registers an agent with the registry or refreshes its registration.
 *
 * Request body: AgentRegistration
 * Response 201: { agentId, health, load, heartbeat }
 */

import { Router, Request, Response } from 'express';
import { agentRegistry, type AgentRegistration } from '../../services/registry-v2';
import { logger } from "@a2a/server-utils/logger";

const router = Router();

router.post('/', (req: Request, res: Response) => {
  const body = req.body as Partial<AgentRegistration>;

  if (!body.agentId || typeof body.agentId !== 'string') {
    res.status(400).json({ success: false, error: 'agentId is required' });
    return;
  }
  if (!Array.isArray(body.caps)) {
    res.status(400).json({ success: false, error: 'caps must be an array' });
    return;
  }
  if (!body.endpoint || typeof body.endpoint !== 'string') {
    res.status(400).json({ success: false, error: 'endpoint is required' });
    return;
  }

  const reg: AgentRegistration = {
    agentId: body.agentId,
    caps: body.caps as string[],
    endpoint: body.endpoint,
    healthEndpoint: typeof body.healthEndpoint === 'string' ? body.healthEndpoint : undefined,
    maxLoad: typeof body.maxLoad === 'number' ? body.maxLoad : undefined,
  };

  try {
    const record = agentRegistry.register(reg);
    logger.info('[registry/register] Registered agent', { agentId: record.agentId });

    res.status(201).json({
      success: true,
      agentId: record.agentId,
      health: record.health,
      load: record.load,
      heartbeat: record.heartbeat,
    });
  } catch (err) {
    const error = err as Error;
    logger.warn('[registry/register] Registration failed', { agentId: reg.agentId, error: error.message });
    res.status(429).json({ success: false, error: error.message });
  }
});

export default router;
