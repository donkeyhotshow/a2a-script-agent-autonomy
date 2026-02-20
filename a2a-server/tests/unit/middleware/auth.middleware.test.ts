import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authMiddleware from '../../../src/middleware/auth.middleware.js';
import * as clientRepo from '../../../src/repositories/client.repository.js';

vi.mock('../../../src/repositories/client.repository.js');

function mockReq(overrides: Record<string, unknown> = {}) {
  return { headers: {}, ...overrides } as never;
}

function mockRes() {
  return {} as never;
}

function mockNext() {
  return vi.fn();
}

describe('auth.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.SKIP_AUTH;
  });

  describe('authenticate', () => {
    it('sets client when SKIP_AUTH=1', async () => {
      process.env.SKIP_AUTH = '1';
      const req = mockReq();
      const next = mockNext();
      await authMiddleware.authenticate(req, mockRes(), next);
      expect(req.client).toEqual({ id: 'dev-client', email: 'dev@localhost' });
      expect(next).toHaveBeenCalled();
    });

    it('authenticates via x-api-key header', async () => {
      const client = { id: 'c1', email: 'a@b.com' };
      vi.mocked(clientRepo.findClientByApiKey).mockResolvedValue(client as never);
      const req = mockReq({ headers: { 'x-api-key': 'sk_xxx' } });
      const next = mockNext();
      await authMiddleware.authenticate(req, mockRes(), next);
      expect(req.client).toEqual({ id: 'c1', email: 'a@b.com' });
      expect(next).toHaveBeenCalled();
    });

    it('authenticates via Bearer token (api key)', async () => {
      const client = { id: 'c1', email: 'a@b.com' };
      vi.mocked(clientRepo.findClientByApiKey).mockResolvedValue(client as never);
      const req = mockReq({ headers: { authorization: 'Bearer sk_a2a_xxx' } });
      const next = mockNext();
      await authMiddleware.authenticate(req, mockRes(), next);
      expect(req.client).toEqual({ id: 'c1', email: 'a@b.com' });
    });

    it('calls next with error when no valid auth', async () => {
      vi.mocked(clientRepo.findClientByApiKey).mockResolvedValue(null);
      const req = mockReq({ headers: {} });
      const next = mockNext();
      await authMiddleware.authenticate(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
      expect(req.client).toBeUndefined();
    });
  });

  describe('requireAuth', () => {
    it('calls next when client present', () => {
      const req = mockReq({ client: { id: 'c1', email: 'a@b.com' } });
      const next = mockNext();
      authMiddleware.requireAuth(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('throws when client missing', () => {
      const req = mockReq({ client: undefined });
      expect(() => authMiddleware.requireAuth(req, mockRes(), mockNext())).toThrow();
    });
  });

  describe('requireOwnership', () => {
    it('calls next when ownership matches', async () => {
      const getResourceClientId = vi.fn().mockResolvedValue('c1');
      const mw = authMiddleware.requireOwnership(getResourceClientId);
      const req = mockReq({ client: { id: 'c1', email: 'a@b.com' } });
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });

    it('calls next with error when ownership mismatch', async () => {
      const getResourceClientId = vi.fn().mockResolvedValue('other');
      const mw = authMiddleware.requireOwnership(getResourceClientId);
      const req = mockReq({ client: { id: 'c1', email: 'a@b.com' } });
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('calls next with error when no client', async () => {
      const getResourceClientId = vi.fn();
      const mw = authMiddleware.requireOwnership(getResourceClientId);
      const req = mockReq({ client: undefined });
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('rateLimitByClient', () => {
    it('calls next (pass-through)', async () => {
      const mw = authMiddleware.rateLimitByClient(100, 60000);
      const req = mockReq();
      const next = mockNext();
      await mw(req, mockRes(), next);
      expect(next).toHaveBeenCalled();
    });
  });
});
