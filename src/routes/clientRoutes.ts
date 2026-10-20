import { Router } from 'express';
import { getClientEvents, getClientEventDetails } from '../controllers/clientController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateJwt, requireRole('CLIENT'));

router.get('/events', getClientEvents);
router.get('/events/:id', getClientEventDetails);

export default router;
