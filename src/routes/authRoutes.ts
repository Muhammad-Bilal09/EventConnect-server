import { Router } from 'express';
import { login, me } from '../controllers/authController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();
router.post('/login', login);
router.get('/me', authenticateJwt, me);
export default router;
