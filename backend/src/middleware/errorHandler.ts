import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  // Log error with level based on status code
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.url} - Error: ${message}\nStack: ${err.stack}`);
  } else {
    logger.warn(`${req.method} ${req.url} - Warning: ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: statusCode >= 500 && process.env.NODE_ENV === 'production' 
        ? 'A system error occurred. Please try again later.' 
        : message
    }
  });
};
