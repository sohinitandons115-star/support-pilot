import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { connectMongo } from './config/db';
import { initializeJobs } from './jobs/cron';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

// Create HTTP Server wrapping the Express app
const server = http.createServer(app);

// Initialize Socket.io
export const io = new Server(server, {
  cors: {
    origin: '*', // Set to specific domain in production
    methods: ['GET', 'POST']
  }
});

// Configure Socket.io Connections
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Join client to a conversation-specific room for updates
  socket.on('join_conversation', ({ conversationId }) => {
    if (conversationId) {
      const room = `conversation_${conversationId}`;
      socket.join(room);
      logger.info(`Socket ${socket.id} joined room: ${room}`);
    }
  });

  socket.on('leave_conversation', ({ conversationId }) => {
    if (conversationId) {
      const room = `conversation_${conversationId}`;
      socket.leave(room);
      logger.info(`Socket ${socket.id} left room: ${room}`);
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start Server Dependencies and Listen
const bootstrap = async () => {
  try {
    // 1. Establish Database Connection (MongoDB)
    await connectMongo();

    // 2. Initialize Cron Jobs
    initializeJobs();

    // 3. Start Server Listen
    server.listen(PORT, () => {
      logger.info(`SupportPilot Backend server running on port: ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

bootstrap();
