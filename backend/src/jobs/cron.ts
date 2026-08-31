import cron from 'node-cron';
import { prisma } from '../config/db';
import { AgentRun } from '../models/MongoModels';
import { logger } from '../utils/logger';

// Job 1: Scan unresolved tickets older than 24 hours and mark them as REQUIRING_ATTENTION
// Runs every night at midnight (0 0 * * *)
export const startTicketEscalationJob = () => {
  cron.schedule('0 0 * * *', async () => {
    logger.info('Starting daily cron job: Ticket Escalation Scanning...');
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);

    try {
      const ticketsToUpdate = await prisma.ticket.findMany({
        where: {
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          },
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      if (ticketsToUpdate.length === 0) {
        logger.info('No tickets requiring escalation today.');
        return;
      }

      const updatedCount = await prisma.ticket.updateMany({
        where: {
          id: {
            in: ticketsToUpdate.map(t => t.id)
          }
        },
        data: {
          status: 'REQUIRING_ATTENTION'
        }
      });

      logger.info(`Successfully escalated ${updatedCount.count} unresolved tickets older than 24 hours.`);
    } catch (error) {
      logger.error('Error running ticket escalation cron job:', error);
    }
  });
  logger.info('Ticket Escalation cron job scheduled (daily at midnight).');
};

// Job 2: Calculate daily AI usage summaries for analytics archiving
// Runs every night at 11:50 PM (50 23 * * *)
export const startAIAnalyticsJob = () => {
  cron.schedule('50 23 * * *', async () => {
    logger.info('Starting daily cron job: AI Usage Summarization...');
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    try {
      const dailyStats = await AgentRun.aggregate([
        {
          $match: {
            timestamp: { $gte: startOfToday }
          }
        },
        {
          $group: {
            _id: '$model',
            totalRequests: { $sum: 1 },
            totalInputTokens: { $sum: '$inputTokens' },
            totalOutputTokens: { $sum: '$outputTokens' },
            totalCost: { $sum: '$estimatedCost' },
            avgLatency: { $avg: '$latency' }
          }
        }
      ]);

      logger.info(`--- DAILY AI USAGE SUMMARY (${new Date().toLocaleDateString()}) ---`);
      if (dailyStats.length === 0) {
        logger.info('No AI usage recorded today.');
      } else {
        dailyStats.forEach(stat => {
          logger.info(`Model: ${stat._id}`);
          logger.info(`  Total Requests: ${stat.totalRequests}`);
          logger.info(`  Tokens: ${stat.totalInputTokens} input / ${stat.totalOutputTokens} output`);
          logger.info(`  Estimated Cost: $${stat.totalCost.toFixed(4)}`);
          logger.info(`  Avg Latency: ${stat.avgLatency.toFixed(2)}ms`);
        });
      }
    } catch (error) {
      logger.error('Error running AI Analytics cron job:', error);
    }
  });
  logger.info('AI Analytics summary cron job scheduled (daily at 11:50 PM).');
};

// Initialize all cron jobs
export const initializeJobs = () => {
  startTicketEscalationJob();
  startAIAnalyticsJob();
};
