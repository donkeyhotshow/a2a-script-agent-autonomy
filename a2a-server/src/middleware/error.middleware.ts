import {Request, Response, NextFunction} from 'express';
import {logger} from '../utils/logger.js';
import {ApiResponse} from '../types/index.js';
import {AppError} from '../types/errors.js';

export {AppError};

// Simple error response helpers
export const notFound = (resource: string = 'Resource') => new AppError('NOT_FOUND', `${resource} not found`, 404);
export const validationError = (field: string, reason: string) =>
    new AppError(
        'VALIDATION_001',
        `Validation failed for field '${field}'`,
        400,
        {field, reason}
    );

export const unauthorized = (code: string = 'AUTH_001', message: string = 'Unauthorized') =>
    new AppError(code, message, 401);

export const forbidden = (message: string = 'Access denied') =>
    new AppError('AUTH_003', message, 403);

// Error handler middleware
export function errorHandler(
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (err instanceof AppError) {
        logger.error('Application error', {
            code: err.code,
            message: err.message,
            statusCode: err.statusCode,
            ...(isProduction ? {} : {stack: err.stack}),
        });

        const errorPayload: Record<string, unknown> = {
            code: err.code,
            message: err.message,
        };
        if (err.details !== undefined) {
            errorPayload.details = err.details;
        }
        if (!isProduction && err.stack) {
            errorPayload.stack = err.stack;
        }

        const response: ApiResponse<never> = {
            success: false,
            error: {
                ...errorPayload,
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
            message: isProduction ? 'An unexpected error occurred' : err.message,
        },
    };

    if (!isProduction && err.stack) {
        (response.error as Record<string, unknown>).stack = err.stack;
    }

    res.status(500).json(response);
}
