import { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { Conversation } from '../models/MongoModels';

const router = Router();

// Retrieve user's AI conversations list
router.get(
  '/',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    try {
      const list = await Conversation.find(
        { userId: req.user.id },
        { messages: { $slice: 1 }, createdAt: 1, updatedAt: 1 }
      ).sort({ updatedAt: -1 });

      const conversations = list.map((c) => {
        const firstMsg = c.messages[0];
        return {
          id: c._id,
          snippet: firstMsg ? firstMsg.content.substring(0, 60) + '...' : 'New Chat Session',
          createdAt: c.createdAt,
          updatedAt: c.updatedAt
        };
      });

      res.status(200).json({
        success: true,
        data: conversations
      });
    } catch (error) {
      next(error);
    }
  }
);

// Retrieve all messages for a specific conversation
router.get(
  '/:id',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const conversationId = req.params.id;

    try {
      const conv = await Conversation.findOne({
        _id: conversationId,
        userId: req.user.id
      });

      if (!conv) {
        return res.status(404).json({
          success: false,
          error: { code: 'CHAT_NOT_FOUND', message: 'Chat conversation not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: conv
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create a new empty chat conversation session
router.post(
  '/',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    try {
      const conv = await Conversation.create({
        userId: req.user.id,
        messages: []
      });

      res.status(201).json({
        success: true,
        data: {
          id: conv._id,
          messages: conv.messages,
          createdAt: conv.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
