import { Router } from 'express';
import { submitRating } from '../controllers/feedbackController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();
router.use(authenticateJwt);

router.post('/rate', submitRating);

export default router;
