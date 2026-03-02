import {AppError} from '../types/errors.js';

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
        {field, reason}
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

