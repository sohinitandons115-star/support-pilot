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

/**
 * Auth & Security Concept: OAuth / 3rd-Party Login
 * 
 * 1. OAuth 2.0 Flow: Receives Google identity tokens or provider profile claims (`email`, `name`, `googleId`).
 * 2. Account Provisioning: Upserts user record in PostgreSQL, assigning default CUSTOMER role and FREE tier subscription.
 * 3. JWT Token Exchange: Issues signed 24h JWT containing user identity and role scopes.
 */
router.post(
  ['/google', '/oauth-simulation'],
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, name, googleId } = req.body;

    if (!email || !name || !googleId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Missing OAuth profile details (email, name, googleId required)' }
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
        logger.info(`Google OAuth 3rd-party new user registered: ${user.email}`);
      } else {
        if (!user.googleId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { googleId }
          });
        }
        logger.info(`Google OAuth 3rd-party user logged in: ${user.email}`);
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
          provider: 'GOOGLE_OAUTH_2.0',
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
