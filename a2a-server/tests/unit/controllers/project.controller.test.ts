import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as projectController from '../../../src/controllers/project.controller.js';
import * as projectRepo from '../../../src/repositories/project.repository.js';
import { AppError } from '../../../src/middleware/error.middleware.js';

vi.mock('../../../src/repositories/project.repository.js');

const mockClient = { id: 'c1', email: 'a@b.com' };

function mockReq(overrides: Record<string, unknown> = {}) {
  return { body: {}, params: {}, query: {}, client: mockClient, ...overrides } as never;
}

function mockRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() } as never;
}

function mockNext() {
  return vi.fn();
}

describe('project.controller', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('listProjects', () => {
    it('returns 401 when no client', async () => {
      const next = mockNext();
      await projectController.listProjects(mockReq({ client: undefined }), mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });
    it('returns projects when client present', async () => {
      vi.mocked(projectRepo.listProjectsByClient).mockResolvedValue({
        projects: [{ id: 'p1', name: 'P1' }] as never,
        total: 1,
      });
      const res = mockRes();
      await projectController.listProjects(mockReq(), res, mockNext());
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });
  });

  describe('createProject', () => {
    it('returns 401 when no client', async () => {
      const next = mockNext();
      await projectController.createProject(mockReq({ client: undefined }), mockRes(), next);
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });
    it('returns 400 when name/gitUrl missing', async () => {
      const next = mockNext();
      await projectController.createProject(mockReq({ body: {} }), mockRes(), next);
      expect((next.mock.calls[0][0] as AppError).code).toBe('VALIDATION_001');
    });
    it('creates project and returns 201', async () => {
      vi.mocked(projectRepo.createProject).mockResolvedValue({
        id: 'p1',
        name: 'P1',
        gitUrl: 'https://github.com/u/r.git',
      } as never);
      const res = mockRes();
      await projectController.createProject(
        mockReq({ body: { name: 'P1', gitUrl: 'https://github.com/u/r.git' } }),
        res,
        mockNext()
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('getProject', () => {
    it('returns 401 when no client', async () => {
      const next = mockNext();
      await projectController.getProject(mockReq({ client: undefined }), mockRes(), next);
      expect((next.mock.calls[0][0] as AppError).code).toBe('AUTH_001');
    });
    it('returns 404 when project not found', async () => {
      vi.mocked(projectRepo.findProjectByIdAndClient).mockResolvedValue(null);
      const next = mockNext();
      await projectController.getProject(
        mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
        mockRes(),
        next
      );
      expect((next.mock.calls[0][0] as AppError).code).toBe('PROJECT_001');
    });
    it('returns project when found', async () => {
      vi.mocked(projectRepo.findProjectByIdAndClient).mockResolvedValue({
        id: 'p1',
        name: 'P1',
      } as never);
      const res = mockRes();
      await projectController.getProject(
        mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });
  });

  describe('deleteProject', () => {
    it('returns 404 when project not found', async () => {
      vi.mocked(projectRepo.findProjectByIdAndClient).mockResolvedValue(null);
      const next = mockNext();
      await projectController.deleteProject(
        mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
        mockRes(),
        next
      );
      expect((next.mock.calls[0][0] as AppError).code).toBe('PROJECT_001');
    });
    it('deletes and returns success', async () => {
      vi.mocked(projectRepo.findProjectByIdAndClient).mockResolvedValue({ id: 'p1' } as never);
      vi.mocked(projectRepo.deleteProject).mockResolvedValue(undefined);
      const res = mockRes();
      await projectController.deleteProject(
        mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('getIndexingStatus', () => {
    it('returns 404 when project not found', async () => {
      vi.mocked(projectRepo.findProjectByIdAndClient).mockResolvedValue(null);
      const next = mockNext();
      await projectController.getIndexingStatus(
        mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
        mockRes(),
        next
      );
      expect((next.mock.calls[0][0] as AppError).code).toBe('PROJECT_001');
    });
    it('returns status when found', async () => {
      vi.mocked(projectRepo.findProjectByIdAndClient).mockResolvedValue({
        id: 'p1',
        status: 'INDEXED',
        indexingProgress: 100,
        lastIndexedAt: new Date(),
      } as never);
      const res = mockRes();
      await projectController.getIndexingStatus(
        mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.any(Object) })
      );
    });
  });

  describe('getArchitecture', () => {
    it('returns 404 when project not found', async () => {
      vi.mocked(projectRepo.getProjectWithFeatures).mockResolvedValue(null);
      const next = mockNext();
      await projectController.getArchitecture(
        mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
        mockRes(),
        next
      );
      expect((next.mock.calls[0][0] as AppError).code).toBe('PROJECT_001');
    });
    it('returns features when found', async () => {
      vi.mocked(projectRepo.getProjectWithFeatures).mockResolvedValue({
        id: 'p1',
        clientId: 'c1',
        architecturalFeatures: [{ feature: 'x', category: 'y' }],
      } as never);
      const res = mockRes();
      await projectController.getArchitecture(
        mockReq({ params: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
        res,
        mockNext()
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { features: expect.any(Array) } })
      );
    });
  });

  describe('searchProject', () => {
    it('calls next with NOT_IMPLEMENTED', async () => {
      const next = mockNext();
      await projectController.searchProject(mockReq(), mockRes(), next);
      expect((next.mock.calls[0][0] as AppError).code).toBe('NOT_IMPLEMENTED');
    });
  });

  describe('handleWebhook', () => {
    it('calls next with NOT_IMPLEMENTED', async () => {
      const next = mockNext();
      await projectController.handleWebhook(mockReq(), mockRes(), next);
      expect((next.mock.calls[0][0] as AppError).code).toBe('NOT_IMPLEMENTED');
    });
  });
});
