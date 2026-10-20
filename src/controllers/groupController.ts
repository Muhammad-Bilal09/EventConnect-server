import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { sanitizeUserForRole } from '../utils/sanitizers';

export const getGroupDetails = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = String(req.params.groupId);
    const userId = req.user!.id;

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!member && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied to this event group.' });
    }

    const group = await prisma.eventGroup.findUnique({
      where: { id: groupId },
      include: {
        event: true,
        members: { include: { user: { include: { clientProfile: true, promoterProfile: true } } } }
      }
    });

    if (!group) return res.status(404).json({ error: 'Event group not found.' });

    const sanitizedMembers = group.members.map(m => ({
      id: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: sanitizeUserForRole(m.user, req.user!.role)
    }));

    return res.json({
      id: group.id,
      eventId: group.eventId,
      eventName: group.event.name,
      status: group.status,
      closedAt: group.closedAt,
      members: sanitizedMembers,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch group details.' });
  }
};

export const getGroupMessages = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = String(req.params.groupId);
    const userId = req.user!.id;

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!member && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const messages = await prisma.message.findMany({
      where: { groupId },
      include: { sender: { include: { clientProfile: true, promoterProfile: true } } },
      orderBy: { createdAt: 'asc' }
    });

    const sanitizedMessages = messages.map(m => ({
      id: m.id,
      groupId: m.groupId,
      messageType: m.messageType,
      content: m.content,
      createdAt: m.createdAt,
      sender: m.sender ? sanitizeUserForRole(m.sender, req.user!.role) : null,
    }));

    return res.json(sanitizedMessages);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const groupId = String(req.params.groupId);
    const { content, messageType } = req.body;
    const userId = req.user!.id;

    if (!content) return res.status(400).json({ error: 'Message content is required.' });

    const group = await prisma.eventGroup.findUnique({ where: { id: groupId } });
    if (!group) return res.status(404).json({ error: 'Group not found.' });

    if (group.status === 'CLOSED') {
      return res.status(400).json({ error: 'This event group is closed. Messaging is disabled.' });
    }

    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } }
    });

    if (!member && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const message = await prisma.message.create({
      data: {
        groupId,
        senderId: userId,
        messageType: messageType || 'TEXT',
        content,
      },
      include: { sender: { include: { clientProfile: true, promoterProfile: true } } }
    });

    const responseMessage = {
      id: message.id,
      groupId: message.groupId,
      messageType: message.messageType,
      content: message.content,
      createdAt: message.createdAt,
      sender: sanitizeUserForRole(message.sender, req.user!.role)
    };

    req.app.get('io')?.to(groupId).emit('new_message', responseMessage);

    return res.status(201).json(responseMessage);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to send message.' });
  }
};
