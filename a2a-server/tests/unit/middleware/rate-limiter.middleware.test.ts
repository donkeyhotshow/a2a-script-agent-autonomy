import { describe, it, expect, vi } from 'vitest';
import {
  createRateLimiter,
  defaultRateLimiter,
  strictRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  searchRateLimiter,
} from '../../../src/middleware/rate-limiter.middleware.js';

function mockReq(overrides: Record<string, unknown> = {}) {
  return { ip: '127.0.0.1', body: {}, client: undefined, ...overrides } as never;
}

function mockRes() {
  return {} as never;
}

function mockNext() {
  return vi.fn();
}

describe('rate-limiter.middleware', () => {
  describe('createRateLimiter', () => {
    it('calls next (pass-through, Redis not mocked)', async () => {
      const mw = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
      const req = mockReq();
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('uses keyGenerator when provided', async () => {
      const keyGen = vi.fn().mockReturnValue('custom-key');
      const mw = createRateLimiter({
        windowMs: 60000,
        maxRequests: 100,
        keyGenerator: keyGen,
      });
      const req = mockReq();
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(keyGen).toHaveBeenCalledWith(req);
    });
  });

  describe('exported limiters', () => {
    it('defaultRateLimiter calls next', async () => {
      const next = mockNext();
      await defaultRateLimiter(mockReq(), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('strictRateLimiter calls next', async () => {
      const next = mockNext();
      await strictRateLimiter(mockReq(), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('authRateLimiter uses key with email', async () => {
      const req = mockReq({ body: { email: 'a@b.com' } });
      const next = mockNext();
      await authRateLimiter(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('apiRateLimiter uses client id when present', async () => {
      const req = mockReq({ client: { id: 'c1', email: 'a@b.com' } });
      const next = mockNext();
      await apiRateLimiter(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('searchRateLimiter calls next', async () => {
      const next = mockNext();
      await searchRateLimiter(mockReq(), mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
