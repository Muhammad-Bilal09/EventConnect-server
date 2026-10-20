import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { sanitizeEventForRole } from '../utils/sanitizers';

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalClients = await prisma.client.count();
    const totalPromoters = await prisma.promoter.count();
    
    const upcomingEvents = await prisma.event.count({ where: { status: 'SCHEDULED' } });
    const activeEvents = await prisma.event.count({ where: { status: 'ACTIVE' } });
    const completedEvents = await prisma.event.count({ where: { status: 'COMPLETED' } });
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayCheckIns = await prisma.checkIn.count({
      where: { checkInTime: { gte: today } }
    });

    const pendingFeedback = await prisma.event.count({
      where: { status: 'COMPLETED' }
    });

    const recentEvents = await prisma.event.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { client: { include: { user: true } }, assignedPromoters: { include: { promoter: { include: { user: true } } } } }
    });

    return res.json({
      totalClients,
      totalPromoters,
      upcomingEvents,
      activeEvents,
      completedEvents,
      todayCheckIns,
      pendingFeedback,
      recentEvents: recentEvents.map(e => sanitizeEventForRole(e, 'ADMIN'))
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to load admin dashboard stats.' });
  }
};

export const getClients = async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      include: { user: true }
    });
    return res.json(clients);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch clients' });
  }
};

export const createClient = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, company, phone, notes } = req.body;
    if (!name || !email || !password || !company) {
      return res.status(400).json({ error: 'Name, email, password, and company are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ error: 'User with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'CLIENT',
        clientProfile: {
          create: {
            company,
            phone: phone || '',
            notes: notes || '',
          }
        }
      },
      include: { clientProfile: true }
    });

    return res.status(201).json(user);
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to create client.' });
  }
};

export const getPromoters = async (req: AuthRequest, res: Response) => {
  try {
    const promoters = await prisma.promoter.findMany({
      include: { user: true }
    });
    return res.json(promoters);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch promoters' });
  }
};

export const createPromoter = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, phone, skills, experience } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return res.status(400).json({ error: 'User with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: 'PROMOTER',
        promoterProfile: {
          create: {
            phone: phone || '',
            skills: skills || 'General Staffing',
            experience: experience || '1 year',
          }
        }
      },
      include: { promoterProfile: true }
    });

    return res.status(201).json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create promoter.' });
  }
};

export const getClientGroups = async (req: AuthRequest, res: Response) => {
  try {
    const groups = await prisma.clientGroup.findMany({
      include: { members: { include: { client: { include: { user: true } } } } }
    });
    return res.json(groups);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch client groups' });
  }
};

export const createClientGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, clientIds } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const group = await prisma.clientGroup.create({
      data: {
        name,
        description: description || '',
        members: {
          create: (clientIds || []).map((cid: string) => ({ clientId: cid }))
        }
      },
      include: { members: true }
    });
    return res.status(201).json(group);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create client group' });
  }
};

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        client: { include: { user: true } },
        assignedPromoters: { include: { promoter: { include: { user: true } } } },
        eventGroup: true,
      },
      orderBy: { startDateTime: 'desc' }
    });

    return res.json(events.map(e => sanitizeEventForRole(e, 'ADMIN')));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch events' });
  }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, clientId, clientGroupId, locationName, address, latitude, longitude,
      checkInRadius, startDateTime, endDateTime, requiredPromoters, description,
      dressCode, instructions, promoterIds
    } = req.body;

    if (!name || !clientId || !locationName || !address || !startDateTime || !endDateTime) {
      return res.status(400).json({ error: 'Required fields missing for event creation.' });
    }

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) return res.status(404).json({ error: 'Client not found.' });

    const event = await prisma.event.create({
      data: {
        name,
        clientId,
        clientGroupId: clientGroupId || null,
        locationName,
        address,
        latitude: parseFloat(latitude) || 25.2048,
        longitude: parseFloat(longitude) || 55.2708,
        checkInRadius: parseFloat(checkInRadius) || 200,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        requiredPromoters: parseInt(requiredPromoters) || 1,
        description,
        dressCode,
        instructions,
        status: 'ACTIVE',
      }
    });

    const group = await prisma.eventGroup.create({
      data: {
        eventId: event.id,
        status: 'ACTIVE',
        members: {
          create: [
            { userId: req.user!.id, role: 'ADMIN' },
            { userId: client.userId, role: 'CLIENT' }
          ]
        }
      }
    });

    if (Array.isArray(promoterIds) && promoterIds.length > 0) {
      for (const pid of promoterIds) {
        const promoter = await prisma.promoter.findUnique({ where: { id: pid } });
        if (promoter) {
          await prisma.eventPromoter.create({
            data: { eventId: event.id, promoterId: pid }
          });
          await prisma.groupMember.create({
            data: { groupId: group.id, userId: promoter.userId, role: 'PROMOTER' }
          });
        }
      }
    }

    await prisma.message.create({
      data: {
        groupId: group.id,
        messageType: 'SYSTEM',
        content: `🎉 Event group created for ${event.name}. Promoters and client team are connected.`
      }
    });

    return res.status(201).json(event);
  } catch (error: any) {
    console.error('Create event error:', error);
    return res.status(500).json({ error: 'Failed to create event.' });
  }
};

export const assignPromoterToEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { eventId, promoterId } = req.body;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { eventGroup: true }
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const promoter = await prisma.promoter.findUnique({ where: { id: promoterId } });
    if (!promoter) return res.status(404).json({ error: 'Promoter not found' });

    const existing = await prisma.eventPromoter.findUnique({
      where: { eventId_promoterId: { eventId, promoterId } }
    });
    if (existing) return res.status(400).json({ error: 'Promoter is already assigned to this event.' });

    await prisma.eventPromoter.create({
      data: { eventId, promoterId }
    });

    if (event.eventGroup) {
      await prisma.groupMember.upsert({
        where: { groupId_userId: { groupId: event.eventGroup.id, userId: promoter.userId } },
        create: { groupId: event.eventGroup.id, userId: promoter.userId, role: 'PROMOTER' },
        update: {}
      });

      const user = await prisma.user.findUnique({ where: { id: promoter.userId } });
      await prisma.message.create({
        data: {
          groupId: event.eventGroup.id,
          messageType: 'SYSTEM',
          content: `👤 ${user?.name || 'Promoter'} was assigned to this event group.`
        }
      });
    }

    return res.json({ message: 'Promoter assigned successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to assign promoter.' });
  }
};

export const removePromoterFromEvent = async (req: AuthRequest, res: Response) => {
  try {
    const eventId = String(req.params.eventId);
    const promoterId = String(req.params.promoterId);

    await prisma.eventPromoter.deleteMany({
      where: { eventId, promoterId }
    });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { eventGroup: true }
    });

    if (event?.eventGroup) {
      const promoter = await prisma.promoter.findUnique({ where: { id: promoterId } });
      if (promoter) {
        await prisma.groupMember.deleteMany({
          where: { groupId: event.eventGroup.id, userId: promoter.userId }
        });
      }
    }

    return res.json({ message: 'Promoter removed from event.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to remove promoter.' });
  }
};

export const endEvent = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const event = await prisma.event.findUnique({
      where: { id },
      include: { eventGroup: true, checkIns: true, assignedPromoters: true }
    });

    if (!event) return res.status(404).json({ error: 'Event not found' });

    await prisma.event.update({
      where: { id },
      data: { status: 'COMPLETED' }
    });

    if (event.eventGroup) {
      await prisma.eventGroup.update({
        where: { id: event.eventGroup.id },
        data: { status: 'CLOSED', closedAt: new Date() }
      });

      await prisma.message.create({
        data: {
          groupId: event.eventGroup.id,
          messageType: 'SYSTEM',
          content: '🔒 Event has been completed. This event group is now closed for messaging.'
        }
      });
    }

    return res.json({
      message: 'Event completed successfully.',
      summary: {
        totalAssigned: event.assignedPromoters.length,
        checkedInCount: event.checkIns.length,
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to end event.' });
  }
};

export const getEventReport = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        client: { include: { user: true } },
        assignedPromoters: { include: { promoter: { include: { user: true } } } },
        checkIns: { include: { promoter: { include: { user: true } } } },
        ratings: { include: { fromUser: true, toUser: true } },
        eventGroup: { include: { messages: { orderBy: { createdAt: 'asc' } } } }
      }
    });

    if (!event) return res.status(404).json({ error: 'Event report not found.' });

    return res.json(sanitizeEventForRole(event, 'ADMIN'));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch event report.' });
  }
};

export const getAllCheckIns = async (req: AuthRequest, res: Response) => {
  try {
    const checkIns = await prisma.checkIn.findMany({
      include: {
        event: true,
        promoter: { include: { user: true } }
      },
      orderBy: { checkInTime: 'desc' }
    });
    return res.json(checkIns);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch check-in history.' });
  }
};

export const getAllFeedback = async (req: AuthRequest, res: Response) => {
  try {
    const ratings = await prisma.rating.findMany({
      include: {
        event: true,
        fromUser: true,
        toUser: true,
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(ratings);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch feedback.' });
  }
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    // Generate system notifications log from recent events, check-ins, and messages
    const recentCheckIns = await prisma.checkIn.findMany({
      take: 10,
      orderBy: { checkInTime: 'desc' },
      include: { event: true, promoter: { include: { user: true } } }
    });

    const recentEvents = await prisma.event.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    const notifications = [
      ...recentCheckIns.map(c => ({
        id: 'ci-' + c.id,
        type: 'CHECK_IN',
        title: `${c.promoter.user?.name || 'Promoter'} Checked In`,
        message: `Checked in for ${c.event.name} at ${new Date(c.checkInTime).toLocaleTimeString()}`,
        createdAt: c.checkInTime,
        read: false
      })),
      ...recentEvents.map(e => ({
        id: 'ev-' + e.id,
        type: 'EVENT',
        title: `Event Created: ${e.name}`,
        message: `Venue: ${e.locationName} | Status: ${e.status}`,
        createdAt: e.createdAt,
        read: true
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json(notifications);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { passwordHash: newHash }
    });

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update password.' });
  }
};
