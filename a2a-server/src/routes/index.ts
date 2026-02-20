import { Router } from 'express';
import authRoutes from './auth.routes.js';
import projectRoutes from './projects.routes.js';
import sessionRoutes from './sessions.routes.js';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Project routes
router.use('/projects', projectRoutes);

// Session routes
router.use('/sessions', sessionRoutes);

export default router;
