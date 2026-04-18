import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '@a2a/server-utils/logger';
import { SkillRegistry } from '../skills/SkillRegistry.js';
import { config } from '@a2a/config';
import {
  SandboxViolationError,
  validateSkillToolCodeForDeploy,
} from '../tools-evolve-sandbox.js';

const router = express.Router();

/**
 * Resolved allowed root for custom skills.
 * All writes are confined to this directory — path traversal is prevented at construction
 * time (toolName is validated by regex) and additionally checked via path.resolve guard.
 *
 * NOTE: This endpoint is disabled by default (config.allowToolsEvolve = false).
 * See a2a-orchestrator/tasks/cancelled/server-skill-evolution-endpoint.md for the
 * architectural rationale and the correct plugin-runtime replacement.
 */
const CUSTOM_SKILLS_ROOT = path.resolve(process.cwd(), 'a2a-server', 'src', 'skills', 'custom');

const registry = new SkillRegistry(CUSTOM_SKILLS_ROOT);

router.post('/evolve', async (req, res) => {
  if (!config.allowToolsEvolve) {
    return res.status(403).json({ error: 'Tools evolve endpoint disabled' });
  }

  const { toolName, toolCode } = req.body;

  if (!toolName || !toolCode) {
    return res.status(400).json({ error: 'toolName and toolCode are required' });
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(toolName)) {
    return res.status(400).json({ error: 'Invalid toolName' });
  }

  logger.info('[Self-Evolve] Received new tool candidate', { toolName });

  try {
    validateSkillToolCodeForDeploy(toolCode);

    // Resolve the target path and verify it remains within CUSTOM_SKILLS_ROOT.
    const targetPath = path.resolve(CUSTOM_SKILLS_ROOT, `${toolName}.skill.ts`);
    if (!targetPath.startsWith(CUSTOM_SKILLS_ROOT + path.sep) && targetPath !== CUSTOM_SKILLS_ROOT) {
      logger.warn('[Self-Evolve] Path traversal attempt blocked', { toolName, targetPath });
      return res.status(400).json({ error: 'Invalid toolName — path traversal detected' });
    }

    await fs.promises.mkdir(CUSTOM_SKILLS_ROOT, { recursive: true });
    await fs.promises.writeFile(targetPath, toolCode);

    // Hot reload registry (stub — no-op until real plugin runtime is wired).
    await registry.init();

    return res.json({ status: 'deployed', path: targetPath });
  } catch (err) {
    if (err instanceof SandboxViolationError) {
      logger.warn('[Self-Evolve] Sandbox rejected', { msg: err.message });
      return res.status(403).json({ error: 'Sandbox violation', detail: err.message });
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('[Self-Evolve] Deployment failed', err);
    return res.status(500).json({ error: msg });
  }
});

export default router;
