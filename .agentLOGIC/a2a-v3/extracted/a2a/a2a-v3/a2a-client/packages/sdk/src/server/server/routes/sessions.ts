// Re-export all session routes from split files
export { default as readRoutes } from './sessions-read.js';
export { default as mutationRoutes } from './sessions-mutation.js';
export { default as asyncRoutes } from './sessions-async.js';

// For backward compatibility, also export a combined router
import { Router } from 'express';
import readRoutes from './sessions-read.js';
import mutationRoutes from './sessions-mutation.js';
import asyncRoutes from './sessions-async.js';

const router = Router();
router.use('/', readRoutes);
router.use('/', mutationRoutes);
router.use('/', asyncRoutes);

export default router;