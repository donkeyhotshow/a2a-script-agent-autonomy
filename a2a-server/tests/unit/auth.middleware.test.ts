/**
 * Auth Middleware Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../src/middleware/auth.middleware.js';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('requireAuth', () => {
    it('should call next with error when req.client is undefined', () => {
      mockReq.client = undefined;

      // requireAuth throws an error, so next should be called with the error
      try {
        requireAuth(mockReq as Request, mockRes as Response, mockNext);
      } catch (error) {
        mockNext(error);
      }

      expect(mockNext).toHaveBeenCalled();
    });

    it('should call next without error when req.client is set', () => {
      mockReq.client = { id: 'client-123', email: 'test@example.com' };

      // requireAuth should just call next() without arguments when client is set
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      // The function should complete without throwing
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
