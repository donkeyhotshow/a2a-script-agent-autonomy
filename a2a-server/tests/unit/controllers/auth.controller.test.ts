import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../../../src/controllers/auth.controller.js';
import * as clientRepo from '../../../src/repositories/client.repository.js';
import { AppError } from '../../../src/middleware/error.middleware.js';

vi.mock('../../../src/repositories/client.repository.js');
vi.mock('../../../src/utils/crypto.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../src/utils/crypto.js')>();
  return {
    ...orig,
    hashPassword: vi.fn().mockResolvedValue('hashed'),
    generateApiKey: vi.fn().mockReturnValue('sk_a2a_testkey'),
    verifyPassword: vi.fn().mockResolvedValue(true),
  };
});

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    headers: {},
    client: { id: 'c1', email: 'a@b.com' },
    ...overrides,
  } as never;
}

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as never;
}

function mockNext() {
  return vi.fn();
}

describe('auth.controller', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('register', () => {
    it('returns 400 when name/email/password missing', async () => {
      const next = mockNext();
      await authController.register(mockReq({ body: {} }), mockRes(), next);
      expect((next.mock.calls[0][0] as AppError).code).toBe('VALIDATION_001');
    });
    it('returns 409 when email exists', async () => {
      vi.mocked(clientRepo.emailExists).mockResolvedValue(true);
      const next = mockNext();
      await authController.register(
        mockReq({ body: { name: 'John', email: 'a@b.com', password: 'Password1' } }),
        mockRes(),
        next
      );
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_002');
    });
    it('creates client and returns 201', async () => {
      vi.mocked(clientRepo.emailExists).mockResolvedValue(false);
      vi.mocked(clientRepo.createClient).mockResolvedValue({
        id: 'c1',
        name: 'John',
        email: 'a@b.com',
      } as never);
      const res = mockRes();
      await authController.register(
        mockReq({ body: { name: 'John', email: 'a@b.com', password: 'Password1' } }),
        res,
        mockNext()
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ apiKey: expect.any(String) }) })
      );
    });
  });

  describe('getToken', () => {
    it('returns 401 when api key invalid', async () => {
      vi.mocked(clientRepo.findClientByApiKey).mockResolvedValue(null);
      const next = mockNext();
      await authController.getToken(
        mockReq({ headers: { 'x-api-key': 'sk_a2a_bad' }, body: {} }),
        mockRes(),
        next
      );
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });
    it('returns tokens when api key valid', async () => {
      vi.mocked(clientRepo.findClientByApiKey).mockResolvedValue({
        id: 'c1',
        email: 'a@b.com',
        isActive: true,
      } as never);
      const res = mockRes();
      await authController.getToken(
        mockReq({ headers: { 'x-api-key': 'sk_a2a_xxx' }, body: {} }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      );
    });
    it('returns 401 when email/password invalid', async () => {
      vi.mocked(clientRepo.findClientByEmail).mockResolvedValue(null);
      const next = mockNext();
      await authController.getToken(
        mockReq({ body: { email: 'a@b.com', password: 'x' } }),
        mockRes(),
        next
      );
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });
    it('returns tokens when email/password valid', async () => {
      vi.mocked(clientRepo.findClientByEmail).mockResolvedValue({
        id: 'c1',
        email: 'a@b.com',
        passwordHash: 'hashed',
        isActive: true,
      } as never);
      const res = mockRes();
      await authController.getToken(
        mockReq({ body: { email: 'a@b.com', password: 'Pass1' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      );
    });
  });

  describe('refreshToken', () => {
    it('returns 401 when refresh token invalid', async () => {
      const next = mockNext();
      await authController.refreshToken(
        mockReq({ body: { refreshToken: 'invalid' } }),
        mockRes(),
        next
      );
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });
    it('returns new tokens when refresh token valid', async () => {
      const { sign } = await import('jsonwebtoken');
      const refreshToken = sign(
        { sub: 'c1', email: 'a@b.com', type: 'refresh' },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      vi.mocked(clientRepo.findClientById).mockResolvedValue({
        id: 'c1',
        email: 'a@b.com',
        isActive: true,
      } as never);
      const res = mockRes();
      await authController.refreshToken(
        mockReq({ body: { refreshToken } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
          }),
        })
      );
    });
  });

  describe('getCurrentClient', () => {
    it('returns 401 when no client', async () => {
      const next = mockNext();
      await authController.getCurrentClient(mockReq({ client: undefined }), mockRes(), next);
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });
    it('returns 401 when client not in DB', async () => {
      vi.mocked(clientRepo.findClientById).mockResolvedValue(null);
      const next = mockNext();
      await authController.getCurrentClient(mockReq(), mockRes(), next);
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });
    it('returns client when found', async () => {
      vi.mocked(clientRepo.findClientById).mockResolvedValue({
        id: 'c1',
        name: 'John',
        email: 'a@b.com',
      } as never);
      const res = mockRes();
      await authController.getCurrentClient(mockReq(), res, mockNext());
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { id: 'c1', name: 'John', email: 'a@b.com' },
      });
    });
  });
});
