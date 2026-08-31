import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { validateRequest } from '../middleware/validation';
import { registerSchema, loginSchema } from '../utils/validationSchemas';
import { authLimiter } from '../middleware/rateLimit';
import { logger } from '../utils/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeyforpilot';

router.post(
  '/register',
  authLimiter,
  validateRequest(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password, name } = req.body;

    try {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'A user with this email address already exists'
          }
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'CUSTOMER' // default role
        }
      });

      // Automatically create a Free subscription profile for new users
      await prisma.subscription.create({
        data: {
          customerId: user.id,
          status: 'INACTIVE',
          tier: 'FREE'
        }
      });

      logger.info(`User registered successfully: ${user.email}`);

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  validateRequest(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findFirst({
        where: { email }
      });

      if (!user || !user.password) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      logger.info(`User logged in: ${user.email}`);

      res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Simulated OAuth login (Google) for development and test modes
router.post(
  '/oauth-simulation',
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, name, googleId } = req.body;

    if (!email || !name || !googleId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Missing simulated profile details' }
      });
    }

    try {
      let user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            googleId,
            role: 'CUSTOMER'
          }
        });

        await prisma.subscription.create({
          data: {
            customerId: user.id,
            status: 'INACTIVE',
            tier: 'FREE'
          }
        });
        logger.info(`Simulated Google OAuth new user created: ${user.email}`);
      } else {
        if (!user.googleId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { googleId }
          });
        }
        logger.info(`Simulated Google OAuth user login: ${user.email}`);
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(200).json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
