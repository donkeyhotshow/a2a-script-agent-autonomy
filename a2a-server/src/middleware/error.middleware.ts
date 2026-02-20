import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';

// Custom error class
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, statusCode: number = 500, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error code to status code mapping
const errorStatusMap: Record<string, number> = {
  // Auth errors
  AUTH_001: 401,
  AUTH_002: 401,
  
  // Project errors
  PROJECT_001: 404,
  PROJECT_002: 500,
  PROJECT_003: 401,
  
  // Session errors
  SESSION_001: 404,
  SESSION_002: 400,
  SESSION_003: 400,
  
  // File errors
  FILE_001: 404,
  FILE_002: 500,
  
  // ML errors
  ML_001: 500,
  ML_002: 500,
  
  // Rate limit
  RATE_001: 429,
  
  // Validation
  VALIDATION_001: 400,
};

// Error handler middleware
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    // Known application error
    logger.error('Application error', {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details,
      stack: err.stack,
    });

    const response: ApiResponse<never> = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // Unknown error
  logger.error('Unexpected error', {
    message: err.message,
    stack: err.stack,
  });

  const response: ApiResponse<never> = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  };

  res.status(500).json(response);
}

// Not found error factory
export function notFound(resource: string): AppError {
  return new AppError('NOT_FOUND', `${resource} not found`, 404);
}

// Validation error factory
export function validationError(field: string, reason: string): AppError {
  return new AppError(
    'VALIDATION_001',
    `Validation failed for field '${field}'`,
    400,
    { field, reason }
  );
}

// Unauthorized error factory
export function unauthorized(code: string = 'AUTH_001', message: string = 'Unauthorized'): AppError {
  return new AppError(code, message, 401);
}

// Forbidden error factory
export function forbidden(message: string = 'Access denied'): AppError {
  return new AppError('AUTH_003', message, 403);
}
