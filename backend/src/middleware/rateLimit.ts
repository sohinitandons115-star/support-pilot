import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/db';

const isTest = process.env.NODE_ENV === 'test';

const getStore = () => {
  if (isTest) return undefined;
  return new RedisStore({
    // @ts-ignore
    sendCommand: async (...args: string[]) => {
      try {
        const res = await redis.call(args[0], ...args.slice(1));
        return Array.isArray(res) ? res : [1, 0];
      } catch {
        return [1, 0];
      }
    },
  });
};

// General API rate limiter (e.g. 100 requests per 15 minutes)
export const apiLimiter = rateLimit({
  store: getStore(),
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests, please try again later.'
    }
  }
});

// Authentication rate limiter (stricter - e.g. 10 attempts per 15 minutes)
export const authLimiter = rateLimit({
  store: getStore(),
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_AUTH_ATTEMPTS',
      message: 'Too many authentication attempts, please try again after 15 minutes.'
    }
  }
});

// AI endpoints rate limiter (e.g. 20 requests per 10 minutes)
export const aiLimiter = rateLimit({
  store: getStore(),
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AI_LIMIT_EXCEEDED',
      message: 'AI query limit reached for this period. Upgrade to Pro for higher limits.'
    }
  }
});

// File upload rate limiter (stricter - e.g. 5 uploads per 10 minutes)
export const uploadLimiter = rateLimit({
  store: getStore(),
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'UPLOAD_LIMIT_EXCEEDED',
      message: 'Too many files uploaded recently. Please wait before trying again.'
    }
  }
});
