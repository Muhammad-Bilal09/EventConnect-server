import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';

export function setupSocketIO(io: Server) {
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, name: true, role: true, email: true }
      });

      if (!user) return next(new Error('User not found'));
      (socket as any).user = user;
      next();
    } catch (err) {
      next(new Error('Invalid socket token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`Socket connected: ${user.name} (${user.role})`);

    socket.on('join_group', async (groupId: string) => {
      try {
        const group = await prisma.eventGroup.findUnique({ where: { id: groupId } });
        if (!group) return;

        const isMember = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId, userId: user.id } }
        });

        if (!isMember && user.role !== 'ADMIN') return;

        socket.join(groupId);
        console.log(`User ${user.name} joined group ${groupId}`);
      } catch (err) {
        console.error('join_group error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user.name}`);
    });
  });
}
