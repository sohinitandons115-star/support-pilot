import express from 'express';
import cors from 'cors';
import { apiLimiter } from './middleware/rateLimit';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

// Import Route Handlers
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import ordersRouter from './routes/orders';
import ticketsRouter from './routes/tickets';
import documentsRouter from './routes/documents';
import conversationsRouter from './routes/conversations';
import aiRouter from './routes/ai';
import adminRouter from './routes/admin';
import paymentsRouter from './routes/payments';

const app = express();

// Disable powered-by header for security
app.disable('x-powered-by');

// Enable CORS
app.use(cors({
  origin: '*', // Customize in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply HTTP Request Logger
app.use(requestLogger);

// 1. Mount Payment Router FIRST (Webhooks require raw body, so they bypass global JSON parsing)
app.use('/api/v1/payments', paymentsRouter);

// 2. Global JSON and URL Encoded Body Parsers for remaining routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply general API rate limiter
app.use(apiLimiter);

// 3. Register Application Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/tickets', ticketsRouter);
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/conversations', conversationsRouter);
app.use('/api/v1/ai', aiRouter);
app.use('/api/v1/admin', adminRouter);

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Centralized Global Error Handler
app.use(errorHandler);

export default app;
