import { Router } from 'express';

const router = Router();

// POST /api/v1/sessions
router.post('/', async (_req, res) => {
  // TODO: Implement create session
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Create session not yet implemented',
    },
  });
});

// GET /api/v1/sessions/:id
router.get('/:id', async (_req, res) => {
  // TODO: Implement get session
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Get session not yet implemented',
    },
  });
});

// POST /api/v1/sessions/:id/message
router.post('/:id/message', async (_req, res) => {
  // TODO: Implement send message (new_task)
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Send message not yet implemented',
    },
  });
});

// POST /api/v1/sessions/:id/files
router.post('/:id/files', async (_req, res) => {
  // TODO: Implement send files
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Send files not yet implemented',
    },
  });
});

// POST /api/v1/sessions/:id/continue
router.post('/:id/continue', async (_req, res) => {
  // TODO: Implement continue session (button "Делаем")
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Continue session not yet implemented',
    },
  });
});

// POST /api/v1/sessions/:id/confirm
router.post('/:id/confirm', async (_req, res) => {
  // TODO: Implement confirm changes
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Confirm changes not yet implemented',
    },
  });
});

// DELETE /api/v1/sessions/:id
router.delete('/:id', async (_req, res) => {
  // TODO: Implement delete session
  res.status(501).json({
    success: false,
    error: {
      code: 'NOT_IMPLEMENTED',
      message: 'Delete session not yet implemented',
    },
  });
});

export default router;
