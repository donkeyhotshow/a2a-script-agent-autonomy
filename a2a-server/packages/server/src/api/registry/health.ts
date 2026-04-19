/**
 * GET /api/registry/health
 *
 * Returns the current health snapshot of the agent registry.
 *
 * Response 200: RegistryHealthSummary
 */

import { Router, Request, Response } from 'express';
import { agentRegistry } from '@a2a/server-services/registry-v2';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const summary = agentRegistry.health();
  res.status(200).json({ success: true, ...summary });
});

/**
 * POST /api/registry/heartbeat
 *
 * Called by agents every ~15 s to signal they are still alive.
 *
 * Request body: { agentId: string }
 * Response 200: { ok: true }
 * Response 404: unknown agent
 */
router.post('/heartbeat', (req: Request, res: Response) => {
  const { agentId } = req.body as { agentId?: string };
  if (!agentId) {
    res.status(400).json({ success: false, error: 'agentId is required' });
    return;
  }
  const ok = agentRegistry.heartbeat(agentId);
  if (!ok) {
    res.status(404).json({ success: false, error: `Unknown agent: ${agentId}` });
    return;
  }
  res.status(200).json({ success: true, ok: true });
});

/**
 * POST /api/registry/drain
 *
 * Manually drain an agent (no new tasks routed to it).
 *
 * Request body: { agentId: string }
 */
router.post('/drain', (req: Request, res: Response) => {
  const { agentId } = req.body as { agentId?: string };
  if (!agentId) {
    res.status(400).json({ success: false, error: 'agentId is required' });
    return;
  }
  const ok = agentRegistry.drain(agentId);
  if (!ok) {
    res.status(404).json({ success: false, error: `Unknown agent: ${agentId}` });
    return;
  }
  res.status(200).json({ success: true, agentId, health: 'draining' });
});

/**
 * DELETE /api/registry/agents/:agentId
 *
 * Deregister an agent.
 */
router.delete('/agents/:agentId', (req: Request, res: Response) => {
  const { agentId } = req.params;
  const ok = agentRegistry.deregister(agentId ?? '');
  if (!ok) {
    res.status(404).json({ success: false, error: `Unknown agent: ${agentId}` });
    return;
  }
  res.status(200).json({ success: true, agentId });
});

export default router;
