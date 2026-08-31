import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { createOrderSchema } from '../utils/validationSchemas';
import { prisma, redis } from '../config/db';
import { logger } from '../utils/logger';

const router = Router();
const ORDER_CACHE_TTL = 300; // 5 minutes

// Fetch customer's orders (or all orders if admin)
router.get(
  '/',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const cacheKey = `user:${req.user.id}:orders`;

    try {
      // Check cache first
      const cachedOrders = await redis.get(cacheKey);
      if (cachedOrders) {
        logger.info(`Serving orders from cache for user: ${req.user.id}`);
        return res.status(200).json({
          success: true,
          data: JSON.parse(cachedOrders),
          cached: true
        });
      }

      let orders;
      if (req.user.role === 'ADMIN') {
        orders = await prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          include: { customer: { select: { name: true, email: true } } }
        });
      } else {
        orders = await prisma.order.findMany({
          where: { customerId: req.user.id },
          orderBy: { createdAt: 'desc' }
        });
      }

      // Save to cache
      await redis.set(cacheKey, JSON.stringify(orders), 'EX', ORDER_CACHE_TTL);

      res.status(200).json({
        success: true,
        data: orders
      });
    } catch (error) {
      next(error);
    }
  }
);

// Fetch details for specific order
router.get(
  '/:id',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const orderId = req.params.id;
    const cacheKey = `order:${orderId}`;

    try {
      // Check cache
      const cachedOrder = await redis.get(cacheKey);
      if (cachedOrder) {
        const orderData = JSON.parse(cachedOrder);
        if (req.user.role !== 'ADMIN' && orderData.customerId !== req.user.id) {
          return res.status(403).json({
            success: false,
            error: { code: 'FORBIDDEN', message: 'Unauthorized to view this order' }
          });
        }
        logger.info(`Serving order details from cache for: ${orderId}`);
        return res.status(200).json({
          success: true,
          data: orderData,
          cached: true
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId }
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' }
        });
      }

      if (req.user.role !== 'ADMIN' && order.customerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Unauthorized to view this order' }
        });
      }

      await redis.set(cacheKey, JSON.stringify(order), 'EX', ORDER_CACHE_TTL);

      res.status(200).json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create a new order (accessible by Admin or for simulation setup)
router.post(
  '/',
  authenticateJWT,
  validateRequest(createOrderSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { orderNumber, customerId, totalAmount, items } = req.body;

    try {
      const order = await prisma.order.create({
        data: {
          orderNumber,
          customerId,
          totalAmount,
          items,
          status: 'PENDING'
        }
      });

      // Invalidate customer orders list cache
      const cacheKey = `user:${customerId}:orders`;
      await redis.del(cacheKey);

      logger.info(`New order created: ${orderNumber} for user ${customerId}`);

      res.status(201).json({
        success: true,
        data: order
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
