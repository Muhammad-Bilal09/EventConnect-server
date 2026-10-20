import { Router } from 'express';
import {
  getDashboardStats, getClients, createClient, getPromoters, createPromoter,
  getClientGroups, createClientGroup, getEvents, createEvent, assignPromoterToEvent,
  removePromoterFromEvent, endEvent, getEventReport, getAllCheckIns, getAllFeedback,
  getNotifications, changePassword
} from '../controllers/adminController';
import { authenticateJwt, requireRole } from '../middleware/auth';

const router = Router();
router.use(authenticateJwt, requireRole('ADMIN'));

router.get('/stats', getDashboardStats);
router.get('/clients', getClients);
router.post('/clients', createClient);
router.get('/promoters', getPromoters);
router.post('/promoters', createPromoter);
router.get('/client-groups', getClientGroups);
router.post('/client-groups', createClientGroup);
router.get('/events', getEvents);
router.post('/events', createEvent);
router.post('/events/assign', assignPromoterToEvent);
router.delete('/events/:eventId/promoter/:promoterId', removePromoterFromEvent);
router.post('/events/:id/end', endEvent);
router.get('/events/:id/report', getEventReport);
router.get('/check-ins', getAllCheckIns);
router.get('/feedback', getAllFeedback);
router.get('/notifications', getNotifications);
router.post('/change-password', changePassword);

export default router;
