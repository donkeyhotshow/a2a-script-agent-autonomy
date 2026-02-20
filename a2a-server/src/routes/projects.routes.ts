import { Router } from 'express';

const router = Router();

// GET /api/v1/projects
router.get('/', async (_req, res) => {
  // TODO: Implement list projects
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'List projects not yet implemented',
    },
  });
});

// POST /api/v1/projects
router.post('/', async (_req, res) => {
  // TODO: Implement create project
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Create project not yet implemented',
    },
  });
});

// GET /api/v1/projects/:id
router.get('/:id', async (_req, res) => {
  // TODO: Implement get project
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Get project not yet implemented',
    },
  });
});

// DELETE /api/v1/projects/:id
router.delete('/:id', async (_req, res) => {
  // TODO: Implement delete project
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Delete project not yet implemented',
    },
  });
});

// GET /api/v1/projects/:id/indexing-status
router.get('/:id/indexing-status', async (_req, res) => {
  // TODO: Implement indexing status
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Indexing status not yet implemented',
    },
  });
});

// GET /api/v1/projects/:id/architecture
router.get('/:id/architecture', async (_req, res) => {
  // TODO: Implement architecture analysis
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Architecture analysis not yet implemented',
    },
  });
});

// POST /api/v1/projects/:id/search
router.post('/:id/search', async (_req, res) => {
  // TODO: Implement search
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Search not yet implemented',
    },
  });
});

// POST /api/v1/projects/:id/webhook
router.post('/:id/webhook', async (_req, res) => {
  // TODO: Implement webhook handler
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Webhook handler not yet implemented',
    },
  });
});

export default router;
