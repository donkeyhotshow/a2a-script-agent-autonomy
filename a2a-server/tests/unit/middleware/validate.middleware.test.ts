import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import * as validateMiddleware from '../../../src/middleware/validate.middleware.js';

function mockReq(overrides: Record<string, unknown> = {}) {
  return { body: {}, params: {}, query: {}, ...overrides } as never;
}

function mockRes() {
  return {} as never;
}

function mockNext() {
  return vi.fn();
}

describe('validate.middleware', () => {
  describe('validateBody', () => {
    it('parses valid body and calls next', async () => {
      const schema = z.object({ name: z.string() });
      const mw = validateMiddleware.validateBody(schema);
      const req = mockReq({ body: { name: 'test' } });
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(req.body).toEqual({ name: 'test' });
      expect(next).toHaveBeenCalled();
    });

    it('calls next with error on invalid', async () => {
      const schema = z.object({ name: z.string().min(2) });
      const mw = validateMiddleware.validateBody(schema);
      const req = mockReq({ body: { name: 'x' } });
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('validateParams', () => {
    it('parses valid params', async () => {
      const schema = z.object({ id: z.string().uuid() });
      const mw = validateMiddleware.validateParams(schema);
      const req = mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } });
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateQuery', () => {
    it('parses valid query', async () => {
      const schema = z.object({ page: z.coerce.number().default(1) });
      const mw = validateMiddleware.validateQuery(schema);
      const req = mockReq({ query: { page: '2' } });
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(req.query).toEqual({ page: 2 });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validate (full)', () => {
    it('parses body, params, query', async () => {
      const schema = z.object({
        body: z.object({ x: z.string() }),
        params: z.object({ id: z.string() }),
        query: z.object({ page: z.coerce.number().default(1) }),
      });
      const mw = validateMiddleware.validate(schema);
      const req = mockReq({ body: { x: 'y' }, params: { id: '1' }, query: {} });
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('sanitize', () => {
    it('keeps only allowed fields', () => {
      const mw = validateMiddleware.sanitize(['name', 'email']);
      const req = mockReq({ body: { name: 'a', email: 'b@c.com', extra: 'x' } });
      const next = mockNext();
      mw(req, mockRes(), next);
      expect(req.body).toEqual({ name: 'a', email: 'b@c.com' });
      expect(next).toHaveBeenCalled();
    });

    it('handles empty body', () => {
      const mw = validateMiddleware.sanitize(['name']);
      const req = mockReq({ body: undefined });
      const next = mockNext();
      mw(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
