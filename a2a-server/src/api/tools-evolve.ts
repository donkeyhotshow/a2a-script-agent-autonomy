import express from 'express';
import fs from 'node:fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { SkillRegistry } from '../skills/SkillRegistry.js';
import { config } from '../config/index.js';
import { validateSkillToolCodeForDeploy } from './tools-evolve-sandbox.js';

const router = express.Router();
const registry = new SkillRegistry(path.join(process.cwd(), 'a2a-server/src/skills/custom'));

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
    // 1. Sandbox validation (Placeholder for real sandboxing)
    // TODO: Implement proper sandboxing with isolated VM (e.g., vm2 replacement or Node vm with restrictions)
    const isSafe = !toolCode.includes('process.exit'); // primitive check

    if (!isSafe) {
      return res.status(403).json({ error: 'Sandbox violation detected' });
    }

    // 2. Write to custom tools directory
    const targetPath = path.join(process.cwd(), 'a2a-server/src/skills/custom', `${toolName}.skill.ts`);
    await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.promises.writeFile(targetPath, toolCode);

    // 3. Hot reload registry
    await registry.init(); 

    res.json({ status: 'deployed', path: targetPath });
  } catch (err) {
    logger.error('[Self-Evolve] Deployment failed', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
