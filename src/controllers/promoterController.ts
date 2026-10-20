import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { sanitizeEventForRole } from '../utils/sanitizers';
import { calculateDistanceMeters } from '../utils/geo';

export const getPromoterEvents = async (req: AuthRequest, res: Response) => {
  try {
    const promoter = await prisma.promoter.findUnique({
      where: { userId: req.user!.id }
    });
    if (!promoter) return res.status(404).json({ error: 'Promoter profile not found' });

    const assignments = await prisma.eventPromoter.findMany({
      where: { promoterId: promoter.id },
      include: {
        event: {
          include: {
            client: { include: { user: true } },
            assignedPromoters: { include: { promoter: { include: { user: true } } } },
            eventGroup: true,
            checkIns: { where: { promoterId: promoter.id } }
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    const events = assignments.map(a => sanitizeEventForRole(a.event, 'PROMOTER'));
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch assigned events' });
  }
};

export const checkIn = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, latitude, longitude } = req.body;
    if (!eventId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Event ID, latitude, and longitude are required.' });
    }

    const promoter = await prisma.promoter.findUnique({ where: { userId: req.user!.id } });
    if (!promoter) return res.status(404).json({ error: 'Promoter profile not found.' });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { eventGroup: true }
    });

    if (!event) return res.status(404).json({ error: 'Event not found.' });

    // Verify distance from event location
    const distance = calculateDistanceMeters(
      parseFloat(latitude),
      parseFloat(longitude),
      event.latitude,
      event.longitude
    );

    if (distance > event.checkInRadius) {
      return res.status(400).json({
        error: `You are currently outside the event check-in area. You are ${distance}m away (allowed: ${event.checkInRadius}m).`,
        distance,
        allowedRadius: event.checkInRadius,
      });
    }

    // Record Check-in
    const checkInRecord = await prisma.checkIn.create({
      data: {
        eventId,
        promoterId: promoter.id,
        checkInTime: new Date(),
        checkInLatitude: parseFloat(latitude),
        checkInLongitude: parseFloat(longitude),
      }
    });

    // Send automatic system message in event group chat
    if (event.eventGroup) {
      const formattedTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await prisma.message.create({
        data: {
          groupId: event.eventGroup.id,
          messageType: 'SYSTEM',
          content: `🟢 ${req.user!.name} checked in at ${formattedTime}`
        }
      });
    }

    return res.json({
      message: 'Check-in successful!',
      checkIn: checkInRecord,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return res.status(500).json({ error: 'Failed to process check-in.' });
  }
};

export const checkOut = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, latitude, longitude } = req.body;
    if (!eventId) return res.status(400).json({ error: 'Event ID is required.' });

    const promoter = await prisma.promoter.findUnique({ where: { userId: req.user!.id } });
    if (!promoter) return res.status(404).json({ error: 'Promoter profile not found.' });

    const activeCheckIn = await prisma.checkIn.findFirst({
      where: { eventId, promoterId: promoter.id, checkOutTime: null },
      orderBy: { checkInTime: 'desc' }
    });

    if (!activeCheckIn) {
      return res.status(400).json({ error: 'No active check-in session found for this event.' });
    }

    const checkOutTime = new Date();
    const durationMs = checkOutTime.getTime() - new Date(activeCheckIn.checkInTime).getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    const updatedCheckIn = await prisma.checkIn.update({
      where: { id: activeCheckIn.id },
      data: {
        checkOutTime,
        checkOutLatitude: latitude !== undefined ? parseFloat(latitude) : null,
        checkOutLongitude: longitude !== undefined ? parseFloat(longitude) : null,
        durationMinutes,
      }
    });

    const event = await prisma.event.findUnique({ where: { id: eventId }, include: { eventGroup: true } });
    if (event?.eventGroup) {
      const formattedTime = checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      await prisma.message.create({
        data: {
          groupId: event.eventGroup.id,
          messageType: 'SYSTEM',
          content: `🔴 ${req.user!.name} checked out at ${formattedTime} (Total duration: ${hours}h ${mins}m)`
        }
      });
    }

    return res.json({
      message: 'Check-out successful!',
      checkIn: updatedCheckIn,
      durationText: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to process check-out.' });
  }
};
