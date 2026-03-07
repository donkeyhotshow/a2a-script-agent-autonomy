import {Request, Response, NextFunction} from 'express';
import {logger} from '../utils/logger.js';
import {ApiResponse} from '../types/index.js';
import {AppError} from '../types/errors.js';

export {AppError};

// Simple error response helpers
export const notFound = (message = 'Resource not found') => new AppError('NOT_FOUND', message, 404);
export const validationError = (message = 'Validation failed') => new AppError('VALIDATION_ERROR', message, 400);
export const unauthorized = (message = 'Unauthorized') => new AppError('UNAUTHORIZED', message, 401);
export const forbidden = (message = 'Forbidden') => new AppError('FORBIDDEN', message, 403);

// Error handler middleware
export function errorHandler(
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const includeStack = process.env.NODE_ENV !== 'production';

    if (err instanceof AppError) {
        logger.error('Application error', {
            code: err.code,
            message: err.message,
            statusCode: err.statusCode,
        });

        const response: ApiResponse<never> = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                details: includeStack ? {stack: err.stack} : undefined,
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
            details: includeStack ? {stack: err.stack} : undefined,
        },
    };

    res.status(500).json(response);
}
