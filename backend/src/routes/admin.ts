import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, authorizeRoles, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { AgentRun, EvaluationResult } from '../models/MongoModels';

const router = Router();

// Retrieve aggregated AI usage statistics and metrics (Admin-only)
router.get(
  '/ai-usage',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Aggregate 1: General Stats Grouped by LLM Model
      const modelStats = await AgentRun.aggregate([
        {
          $group: {
            _id: '$model',
            totalRequests: { $sum: 1 },
            totalInputTokens: { $sum: '$inputTokens' },
            totalOutputTokens: { $sum: '$outputTokens' },
            totalTokens: { $sum: '$totalTokens' },
            totalCost: { $sum: '$estimatedCost' },
            avgLatency: { $avg: '$latency' }
          }
        },
        { $sort: { totalCost: -1 } }
      ]);

      // Aggregate 2: Tool Usage Statistics
      const toolStats = await AgentRun.aggregate([
        { $match: { toolsUsed: { $exists: true, $ne: [] } } },
        { $unwind: '$toolsUsed' },
        {
          $group: {
            _id: '$toolsUsed',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      // Calculate totals
      let totalCost = 0;
      let totalTokens = 0;
      let totalRequests = 0;

      modelStats.forEach((m) => {
        totalCost += m.totalCost;
        totalTokens += m.totalTokens;
        totalRequests += m.totalRequests;
      });

      res.status(200).json({
        success: true,
        data: {
          totals: {
            requests: totalRequests,
            tokens: totalTokens,
            cost: totalCost,
          },
          models: modelStats,
          tools: toolStats
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Retrieve all past automated LLM evaluation runs (Admin-only)
router.get(
  '/evaluations',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const evaluations = await EvaluationResult.find({}).sort({ createdAt: -1 });
      res.status(200).json({
        success: true,
        data: evaluations
      });
    } catch (error) {
      next(error);
    }
  }
);

// Retrieve all registered system users (Admin-only)
router.get(
  '/users',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: {
            select: {
              tier: true,
              status: true
            }
          }
        }
      });
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      next(error);
    }
  }
);

// Retrieve all tickets (Admin-only, direct access)
router.get(
  '/tickets',
  authenticateJWT,
  authorizeRoles('ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tickets = await prisma.ticket.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });
      res.status(200).json({
        success: true,
        data: tickets
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
