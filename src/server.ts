import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import clientRoutes from './routes/clientRoutes';
import promoterRoutes from './routes/promoterRoutes';
import groupRoutes from './routes/groupRoutes';
import feedbackRoutes from './routes/feedbackRoutes';
import { setupSocketIO } from './sockets/chatHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});
app.set('io', io);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'EventConnect Backend', message: 'API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EventConnect Backend', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/promoter', promoterRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/feedback', feedbackRoutes);

// Setup Socket.IO
setupSocketIO(io);

const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`🚀 EventConnect Backend Server running on http://localhost:${PORT}`);
  });
}

export default app;
export { app, server, io };
