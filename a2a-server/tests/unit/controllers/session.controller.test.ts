import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionController from '../../../src/controllers/session.controller.js';
import * as sessionService from '../../../src/services/session.service.js';
import { AppError } from '../../../src/middleware/error.middleware.js';

vi.mock('../../../src/services/session.service.js');
vi.mock('../../../src/protocol/message-builder.js', () => ({ buildServerMessage: vi.fn() }));

const mockClient = { id: 'client-1' };

function mockReq(overrides: Record<string, unknown> = {}) {
  return { client: mockClient, body: {}, params: {}, ...overrides } as never;
}

function mockRes() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as never;
}

function mockNext() {
  return vi.fn();
}

describe('session.controller', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createSession', () => {
    it('returns 401 when client not authenticated', async () => {
      const next = mockNext();
      await sessionController.createSession(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });

    it('returns 400 when project_id missing', async () => {
      const next = mockNext();
      await sessionController.createSession(mockReq({ body: {} }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).code).toBe('VALIDATION_001');
    });

    it('returns 201 with session on success', async () => {
      const session = {
        id: 's1',
        projectId: 'p1',
        status: 'CREATED',
        createdAt: new Date(),
      };
      vi.mocked(sessionService.createSession).mockResolvedValue(session as never);
      const res = mockRes();
      await sessionController.createSession(
        mockReq({ body: { project_id: 'p1' } }),
        res,
        mockNext()
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ session_id: 's1', project_id: 'p1' }),
        })
      );
    });
  });

  describe('getSession', () => {
    it('returns 401 when client not authenticated', async () => {
      const next = mockNext();
      await sessionController.getSession(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns 404 when session not found', async () => {
      vi.mocked(sessionService.getSessionById).mockResolvedValue(null);
      const next = mockNext();
      await sessionController.getSession(
        mockReq({ params: { id: 's1' } }),
        mockRes(),
        next
      );
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).code).toBe('SESSION_001');
    });

    it('returns session with tasks on success', async () => {
      const session = {
        id: 's1',
        projectId: 'p1',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        tasks: [{ id: 't1', type: 'ANALYZE', status: 'IN_PROGRESS', progress: 0 }],
      };
      vi.mocked(sessionService.getSessionById).mockResolvedValue(session as never);
      const res = mockRes();
      await sessionController.getSession(
        mockReq({ params: { id: 's1' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ session_id: 's1', tasks: expect.any(Array) }),
        })
      );
    });
  });

  describe('getSessionContext', () => {
    it('returns 401 when client not authenticated', async () => {
      const next = mockNext();
      await sessionController.getSessionContext(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns 404 when session not found', async () => {
      vi.mocked(sessionService.getSessionById).mockResolvedValue(null);
      const next = mockNext();
      await sessionController.getSessionContext(
        mockReq({ params: { id: 's1' } }),
        mockRes(),
        next
      );
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns context on success', async () => {
      const ctx = { version: '1.0' as const, session_id: 's1', tasks: [] };
      vi.mocked(sessionService.getSessionById).mockResolvedValue({ context: ctx } as never);
      const res = mockRes();
      await sessionController.getSessionContext(
        mockReq({ params: { id: 's1' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { context: ctx } });
    });
  });

  describe('sendMessage', () => {
    it('returns 401 when client not authenticated', async () => {
      const next = mockNext();
      await sessionController.sendMessage(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns 400 when new_task empty or not array', async () => {
      const next = mockNext();
      await sessionController.sendMessage(
        mockReq({ params: { id: 's1' }, body: { new_task: [] } }),
        mockRes(),
        next
      );
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).code).toBe('SESSION_003');
    });

    it('returns tasks on success', async () => {
      const ctx = { version: '1.0' as const, session_id: 's1', tasks: [] };
      const tasks = [{ id: 't1', type: 'analyze', status: 'in_progress', target: 'x', progress: 0 }];
      vi.mocked(sessionService.processNewTask).mockResolvedValue({
        context: ctx,
        tasks,
        requestFiles: [],
      });
      const res = mockRes();
      await sessionController.sendMessage(
        mockReq({ params: { id: 's1' }, body: { new_task: ['do something'] } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ tasks, session_id: 's1' }),
        })
      );
    });
  });

  describe('sendFiles', () => {
    it('returns 401 when client not authenticated', async () => {
      const next = mockNext();
      await sessionController.sendFiles(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns 404 when session not found', async () => {
      vi.mocked(sessionService.getSessionById).mockResolvedValue(null);
      const next = mockNext();
      await sessionController.sendFiles(
        mockReq({ params: { id: 's1' }, body: { files: [{ path: 'a', content: 'b' }] } }),
        mockRes(),
        next
      );
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns 400 when files not array', async () => {
      vi.mocked(sessionService.getSessionById).mockResolvedValue({ id: 's1' } as never);
      const next = mockNext();
      await sessionController.sendFiles(
        mockReq({ params: { id: 's1' }, body: { files: 'not-array' } }),
        mockRes(),
        next
      );
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns success on valid files', async () => {
      vi.mocked(sessionService.getSessionById).mockResolvedValue({ id: 's1' } as never);
      vi.mocked(sessionService.storeMessage).mockResolvedValue(undefined as never);
      const res = mockRes();
      await sessionController.sendFiles(
        mockReq({ params: { id: 's1' }, body: { files: [{ path: 'a', content: 'b' }] } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ message: 'Files received' }) })
      );
    });
  });

  describe('continueSession', () => {
    it('returns 401 when client not authenticated', async () => {
      const next = mockNext();
      await sessionController.continueSession(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns success on continue', async () => {
      const ctx = { version: '1.0' as const, session_id: 's1', tasks: [] };
      vi.mocked(sessionService.handleContinue).mockResolvedValue(ctx);
      const res = mockRes();
      await sessionController.continueSession(
        mockReq({ params: { id: 's1' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ message: 'Continue acknowledged' }) })
      );
    });
  });

  describe('confirmChanges', () => {
    it('returns 401 when client not authenticated', async () => {
      const next = mockNext();
      await sessionController.confirmChanges(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns success on confirm', async () => {
      const ctx = { version: '1.0' as const, session_id: 's1', tasks: [] };
      vi.mocked(sessionService.handleConfirm).mockResolvedValue({ success: true, context: ctx });
      const res = mockRes();
      await sessionController.confirmChanges(
        mockReq({ params: { id: 's1' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ confirmed: true }) })
      );
    });
  });

  describe('deleteSession', () => {
    it('returns 401 when client not authenticated', async () => {
      const next = mockNext();
      await sessionController.deleteSession(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns 404 when session not found', async () => {
      vi.mocked(sessionService.getSessionById).mockResolvedValue(null);
      const next = mockNext();
      await sessionController.deleteSession(
        mockReq({ params: { id: 's1' } }),
        mockRes(),
        next
      );
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('returns 204 on success', async () => {
      vi.mocked(sessionService.getSessionById).mockResolvedValue({ id: 's1' } as never);
      vi.mocked(sessionService.deleteSession).mockResolvedValue(undefined);
      const res = mockRes();
      await sessionController.deleteSession(
        mockReq({ params: { id: 's1' } }),
        res,
        mockNext()
      );
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});
