import express from 'express';
import fs from 'node:fs';
import path from 'path';
import { logger } from '../../lib/logger.js';
import { SkillRegistry } from '../../../features/src/skills/SkillRegistry.js';
import { config } from '../../../server-config/index.js';
import {
  SandboxViolationError,
  validateSkillToolCodeForDeploy,
} from './tools-evolve-sandbox.js';

const router = express.Router();
const registry = new SkillRegistry(path.join(process.cwd(), 'a2a-server/src/skills/custom'));

router.post('/evolve', async (req, res) => {
  if (!config.features.actions.allowToolsEvolve) {
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

    // 2. Write to custom tools directory
    const targetPath = path.join(process.cwd(), 'a2a-server/src/skills/custom', `${toolName}.skill.ts`);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, toolCode);

    // 3. Hot reload registry
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
