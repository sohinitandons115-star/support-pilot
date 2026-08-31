import { Router, Response } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';

const router = Router();

router.get(
  '/profile',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    try {
      const profile = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: true
        }
      });

      if (!profile) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User profile not found' }
        });
      }

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Could not retrieve user profile' }
      });
    }
  }
);

export default router;
