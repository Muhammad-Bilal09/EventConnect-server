import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();
router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticateJwt, me);
export default router;
