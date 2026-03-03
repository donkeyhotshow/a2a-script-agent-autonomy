import {Router} from 'express';
import {authenticate} from '../middleware/auth.middleware.js';
import * as authController from '../controllers/auth.controller.js';
import {validateBody} from '../middleware/validate.middleware.js';
import {registerInputSchema} from '../utils/validation.js';

const router = Router();

router.post(
    '/register',
    validateBody(registerInputSchema),
    authController.register
);

router.post('/token', authController.getToken);
router.post('/refresh', authController.refreshToken);

router.get('/me', authenticate, authController.getCurrentClient);

export default router;

