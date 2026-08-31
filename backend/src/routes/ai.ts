import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { chatQuerySchema } from '../utils/validationSchemas';
import { aiLimiter } from '../middleware/rateLimit';
import { runAgent } from '../services/agent.service';
import { Conversation } from '../models/MongoModels';
import { io } from '../server';
import { logger } from '../utils/logger';

const router = Router();

router.post(
  '/chat',
  authenticateJWT,
  aiLimiter,
  validateRequest(chatQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const { message, conversationId } = req.body;
    let activeConvId = conversationId;

    try {
      // 1. Create or find conversation
      if (!activeConvId) {
        const newConv = await Conversation.create({
          userId: req.user.id,
          messages: []
        });
        activeConvId = newConv._id.toString();
      }

      // Set headers for Server-Sent Events (SSE)
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      // Callback to emit agent progress steps over Socket.io
      const onStatusUpdate = (event: string, data?: any) => {
        logger.info(`Socket Emit: ${event} on room conversation_${activeConvId}`);
        io.to(`conversation_${activeConvId}`).emit(event, {
          conversationId: activeConvId,
          ...data
        });
      };

      // 2. Execute the multi-step agent loop
      const agentResult = await runAgent(activeConvId, message, {
        userId: req.user.id,
        onStatusUpdate
      });

      // 3. Stream the text answer chunk-by-chunk to the client
      const answer = agentResult.answer;
      const chunkSize = 15; // characters per chunk
      let index = 0;

      const interval = setInterval(() => {
        if (index < answer.length) {
          const chunk = answer.substring(index, index + chunkSize);
          res.write(`data: ${JSON.stringify({ type: 'content', chunk })}\n\n`);
          index += chunkSize;
        } else {
          clearInterval(interval);
          // Send final structured metadata at the end of the SSE stream
          res.write(`data: ${JSON.stringify({
            type: 'done',
            metadata: {
              conversationId: activeConvId,
              intent: agentResult.intent,
              sources: agentResult.sources,
              confidence: agentResult.confidence,
              actionTaken: agentResult.actionTaken,
              tokens: agentResult.tokens,
              cost: agentResult.cost
            }
          })}\n\n`);
          res.end();
        }
      }, 50);

    } catch (error: any) {
      logger.error('Error in RAG Agent chat stream:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Stream processing failed' })}\n\n`);
      res.end();
    }
  }
);

export default router;
