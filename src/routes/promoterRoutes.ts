import { Router } from 'express';
import { getPromoterEvents, checkIn, checkOut } from '../controllers/promoterController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateJwt, requireRole('PROMOTER'));

router.get('/events', getPromoterEvents);
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);

export default router;
