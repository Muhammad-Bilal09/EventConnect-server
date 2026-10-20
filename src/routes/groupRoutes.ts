import { Router } from 'express';
import { getGroupDetails, getGroupMessages, sendMessage } from '../controllers/groupController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();
router.use(authenticateJwt);

router.get('/:groupId', getGroupDetails);
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', sendMessage);

export default router;
