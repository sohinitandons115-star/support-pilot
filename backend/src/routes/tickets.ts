import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createTicketSchema, createMessageSchema } from '../utils/validationSchemas';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

const router = Router();

// Get list of support tickets
router.get(
  '/',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    try {
      let tickets;
      if (req.user.role === 'ADMIN') {
        tickets = await prisma.ticket.findMany({
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { name: true, email: true } } }
        });
      } else {
        tickets = await prisma.ticket.findMany({
          where: { customerId: req.user.id },
          orderBy: { createdAt: 'desc' }
        });
      }

      res.status(200).json({
        success: true,
        data: tickets
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get specific ticket and its messages thread
// SQL (Postgres) Concept: Multi-table SQL JOINs executed via Prisma 'include'
// Translates to: SELECT * FROM "Ticket" INNER JOIN "User" ON ... LEFT JOIN "TicketMessage" ON ...
router.get(
  '/:id',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const ticketId = req.params.id;

    try {
      // SQL JOIN: Joins Ticket table with User (customer) and TicketMessage tables
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          customer: { select: { name: true, email: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { sender: { select: { name: true, role: true } } }
          }
        }
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: { code: 'TICKET_NOT_FOUND', message: 'Support ticket not found' }
        });
      }

      if (req.user.role !== 'ADMIN' && ticket.customerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized to view this ticket' }
        });
      }

      res.status(200).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create a new support ticket
router.post(
  '/',
  authenticateJWT,
  validateRequest(createTicketSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const { title, description, category } = req.body;
    const ticketNumber = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber,
          title,
          description,
          category,
          customerId: req.user.id,
          status: 'OPEN',
          priority: 'MEDIUM'
        }
      });

      logger.info(`Ticket created: ${ticket.ticketNumber} by user ${req.user.id}`);

      res.status(201).json({
        success: true,
        data: ticket
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add a reply message to a ticket thread
router.post(
  '/:id/messages',
  authenticateJWT,
  validateRequest(createMessageSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const ticketId = req.params.id;
    const { message } = req.body;

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId }
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: { code: 'TICKET_NOT_FOUND', message: 'Support ticket not found' }
        });
      }

      if (req.user.role !== 'ADMIN' && ticket.customerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized to reply to this ticket' }
        });
      }

      // SQL (Postgres) Concept: ACID Database Transactions
      // Executes ticket message insertion AND ticket status update in a single atomic transaction.
      // If either operation fails, the transaction rolls back completely to maintain database consistency.
      let newStatus: 'IN_PROGRESS' | 'OPEN' = req.user.role === 'ADMIN' ? 'IN_PROGRESS' : 'OPEN';

      const [ticketMessage] = await prisma.$transaction([
        prisma.ticketMessage.create({
          data: {
            ticketId,
            senderId: req.user.id,
            message
          },
          include: { sender: { select: { name: true, role: true } } }
        }),
        prisma.ticket.update({
          where: { id: ticketId },
          data: { status: newStatus }
        })
      ]);

      logger.info(`Message added atomically to ticket ${ticket.ticketNumber} by ${req.user.id}`);

      res.status(201).json({
        success: true,
        data: ticketMessage
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
