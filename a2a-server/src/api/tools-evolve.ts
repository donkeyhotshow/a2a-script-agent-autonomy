import express from 'express';
import fs from 'node:fs';
import path from 'path';
import { logger } from '../utils/logger.js';
import { SkillRegistry } from '../skills/SkillRegistry.js';

const router = express.Router();
const registry = new SkillRegistry(path.join(process.cwd(), 'a2a-server/src/skills/custom'));

router.post('/evolve', async (req, res) => {
  const { toolName, toolCode, testCases } = req.body;

  if (!toolName || !toolCode) {
    return res.status(400).json({ error: 'toolName and toolCode are required' });
  }

  logger.info('[Self-Evolve] Received new tool candidate', { toolName });

  try {
    // 1. Sandbox validation (Placeholder for real VM2/SkillLite logic)
    // For now, we check for basic syntax or just simulate success
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
  } catch (err: any) {
    logger.error('[Self-Evolve] Deployment failed', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
