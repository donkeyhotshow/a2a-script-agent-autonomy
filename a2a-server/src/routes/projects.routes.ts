import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// TODO: implement projects routes according to `plans/sessions-routes-improvements.md`.

router.use(authenticate);

router.get('/', (_req: Request, res: Response) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Projects routes are not implemented yet.' },
  });
});

export default router;

