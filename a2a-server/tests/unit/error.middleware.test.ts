/**
 * Error Middleware Unit Tests
 */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Request, Response, NextFunction} from 'express';
import {
    AppError,
    errorHandler,
    notFound,
    validationError,
    unauthorized,
    forbidden
} from '../../src/middleware/error.middleware.js';

describe('Error Middleware', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockReq = {};
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn(),
        };
        mockNext = vi.fn();

        vi.mock('../../src/utils/logger.js', () => ({
            logger: {
                error: vi.fn(),
            },
        }));
    });

    describe('AppError', () => {
        it('should create error with all properties', () => {
            const error = new AppError('TEST_001', 'Test error', 400, {field: 'test'});

            expect(error.code).toBe('TEST_001');
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(400);
            expect(error.details).toEqual({field: 'test'});
            expect(error.stack).toBeDefined();
        });

        it('should default to 500 status code', () => {
            const error = new AppError('TEST_002', 'Internal error');

            expect(error.statusCode).toBe(500);
        });
    });

    describe('errorHandler', () => {
        it('should handle AppError with correct status code', () => {
            const error = new AppError('AUTH_001', 'Unauthorized', 401);

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'AUTH_001',
                    message: 'Unauthorized',
                },
            });
        });

        it('should handle AppError with details', () => {
            const error = new AppError('VALIDATION_001', 'Validation failed', 400, {field: 'email'});

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'VALIDATION_001',
                    message: 'Validation failed',
                    details: {field: 'email'},
                },
            });
        });

        it('should handle unknown errors with 500', () => {
            const error = new Error('Unknown error');

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'An unexpected error occurred',
                },
            });
        });

        it('should handle error with explicit 400 status', () => {
            const error = new AppError('VALIDATION_001', 'Validation failed', 400);

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should handle error with explicit 429 status', () => {
            const error = new AppError('RATE_001', 'Too many requests', 429);

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(429);
        });

        it('should handle error with explicit 404 status', () => {
            const error = new AppError('NOT_FOUND', 'Resource not found', 404);

            errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });

    describe('Error Factory Functions', () => {
        describe('notFound', () => {
            it('should create 404 error', () => {
                const error = notFound('Session');

                expect(error.code).toBe('NOT_FOUND');
                expect(error.message).toBe('Session not found');
                expect(error.statusCode).toBe(404);
            });
        });

        describe('validationError', () => {
            it('should create validation error with details', () => {
                const error = validationError('email', 'Invalid format');

                expect(error.code).toBe('VALIDATION_001');
                expect(error.message).toBe("Validation failed for field 'email'");
                expect(error.statusCode).toBe(400);
                expect(error.details).toEqual({field: 'email', reason: 'Invalid format'});
            });
        });

        describe('unauthorized', () => {
            it('should create default unauthorized error', () => {
                const error = unauthorized();

                expect(error.code).toBe('AUTH_001');
                expect(error.message).toBe('Unauthorized');
                expect(error.statusCode).toBe(401);
            });

            it('should create custom unauthorized error', () => {
                const error = unauthorized('AUTH_002', 'Invalid token');

                expect(error.code).toBe('AUTH_002');
                expect(error.message).toBe('Invalid token');
            });
        });

        describe('forbidden', () => {
            it('should create 403 error', () => {
                const error = forbidden();

                expect(error.code).toBe('AUTH_003');
                expect(error.message).toBe('Access denied');
                expect(error.statusCode).toBe(403);
            });

            it('should create custom forbidden error', () => {
                const error = forbidden('Admin access required');

                expect(error.message).toBe('Admin access required');
            });
        });
    });
});
