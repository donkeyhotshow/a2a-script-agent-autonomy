import {Request, Response, NextFunction} from 'express';
import {logger} from '../utils/logger.js';
import {ApiResponse} from '../types/index.js';
import {AppError} from '../types/errors.js';
import {forbidden, notFound, unauthorized, validationError} from '../errors/http-errors.js';

export {AppError};

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
    const includeStack = process.env.NODE_ENV !== 'production';

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
                details: includeStack
                    ? {...err.details, stack: err.stack}
                    : err.details,
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

// Not found error factory
export {notFound, validationError, unauthorized, forbidden};
