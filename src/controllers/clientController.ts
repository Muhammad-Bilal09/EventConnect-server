import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { sanitizeEventForRole } from '../utils/sanitizers';

export const getClientEvents = async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { userId: req.user!.id }
    });
    if (!client) return res.status(404).json({ error: 'Client profile not found' });

    const events = await prisma.event.findMany({
      where: { clientId: client.id },
      include: {
        client: { include: { user: true } },
        assignedPromoters: { include: { promoter: { include: { user: true } } } },
        eventGroup: true,
        checkIns: { include: { promoter: { include: { user: true } } } },
      },
      orderBy: { startDateTime: 'desc' }
    });

    return res.json(events.map(e => sanitizeEventForRole(e, 'CLIENT')));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch client events' });
  }
};

export const getClientEventDetails = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const client = await prisma.client.findUnique({ where: { userId: req.user!.id } });
    if (!client) return res.status(404).json({ error: 'Client profile not found' });

    const event = await prisma.event.findFirst({
      where: { id, clientId: client.id },
      include: {
        client: { include: { user: true } },
        assignedPromoters: { include: { promoter: { include: { user: true } } } },
        eventGroup: true,
        checkIns: true,
        ratings: true,
      }
    });

    if (!event) return res.status(404).json({ error: 'Event not found or unauthorized' });

    return res.json(sanitizeEventForRole(event, 'CLIENT'));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch event details' });
  }
};
