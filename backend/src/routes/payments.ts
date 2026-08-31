import express, { Router, Response, NextFunction } from 'express';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { checkoutSchema } from '../utils/validationSchemas';
import { createCheckoutSession, handleStripeWebhook, simulatePaymentUpgrade } from '../services/payment.service';
import { logger } from '../utils/logger';

const router = Router();

// Create standard Stripe checkout session
router.post(
  '/create-checkout',
  authenticateJWT,
  validateRequest(checkoutSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    const { priceId, successUrl, cancelUrl } = req.body;

    try {
      const session = await createCheckoutSession(req.user.id, priceId, successUrl, cancelUrl);
      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error) {
      next(error);
    }
  }
);

// Simulated checkout upgrade for development (when Stripe keys are absent)
router.post(
  '/simulate-upgrade',
  authenticateJWT,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

    try {
      const sub = await simulatePaymentUpgrade(req.user.id);
      res.status(200).json({
        success: true,
        data: {
          subscription: sub,
          message: 'Local subscription successfully updated to PRO'
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// Webhook listener for Stripe events (Note: requires raw body stream on express config)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: express.Request, res: express.Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).send('Webhook signature is missing');
    }

    try {
      await handleStripeWebhook(req.body, signature);
      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error(`Webhook Processing Error: ${error.message}`);
      res.status(400).send(`Webhook Error: ${error.message}`);
    }
  }
);

export default router;
