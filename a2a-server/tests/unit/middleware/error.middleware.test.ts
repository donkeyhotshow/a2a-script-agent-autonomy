import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler, AppError, notFound, validationError, unauthorized, forbidden } from '../../../src/middleware/error.middleware.js';

vi.mock('../../../src/utils/logger.js', () => ({ logger: { error: vi.fn() } }));

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as never;
}

describe('error.middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('AppError', () => {
    it('creates error with code and statusCode', () => {
      const err = new AppError('E001', 'msg', 400);
      expect(err.code).toBe('E001');
      expect(err.message).toBe('msg');
      expect(err.statusCode).toBe(400);
    });
  });

  describe('errorHandler', () => {
    it('handles AppError with correct status and body', () => {
      const res = mockRes();
      const err = new AppError('E001', 'msg', 400);
      errorHandler(err, {} as never, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'E001', message: 'msg' }),
        })
      );
    });

    it('handles unknown error with 500', () => {
      const res = mockRes();
      errorHandler(new Error('unknown'), {} as never, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'INTERNAL_ERROR' }),
        })
      );
    });
  });

  describe('notFound, validationError, unauthorized, forbidden', () => {
    it('notFound', () => {
      const err = notFound('Session');
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.statusCode).toBe(404);
    });
    it('validationError', () => {
      const err = validationError('email', 'invalid');
      expect(err.code).toBe('VALIDATION_001');
      expect(err.statusCode).toBe(400);
      expect(err.details).toEqual({ field: 'email', reason: 'invalid' });
    });
    it('unauthorized', () => {
      const err = unauthorized();
      expect(err.code).toBe('AUTH_001');
      expect(err.statusCode).toBe(401);
    });
    it('forbidden', () => {
      const err = forbidden('Access denied');
      expect(err.code).toBe('AUTH_003');
      expect(err.statusCode).toBe(403);
    });
  });
});
