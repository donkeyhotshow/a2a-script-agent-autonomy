import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as sessionService from '../../../src/services/session.service.js';
import * as sessionRepo from '../../../src/repositories/session.repository.js';
import * as projectRepo from '../../../src/repositories/project.repository.js';
import { AppError } from '../../../src/middleware/error.middleware.js';

vi.mock('../../../src/repositories/session.repository.js');
vi.mock('../../../src/repositories/project.repository.js');
vi.mock('../../../src/knowledge/neurons/neuron-activator.js', () => ({
  activateNeurons: vi.fn().mockReturnValue([]),
}));

describe('session.service', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createSession', () => {
    it('throws PROJECT_001 when project not found', async () => {
      vi.mocked(projectRepo.findProjectByIdAndClient).mockResolvedValue(null);
      try {
        await sessionService.createSession({ projectId: 'p1', clientId: 'c1' });
      } catch (e) {
        expect(e).toBeInstanceOf(AppError);
        expect((e as AppError).code).toBe('PROJECT_001');
      }
    });

    it('creates session when project exists', async () => {
      vi.mocked(projectRepo.findProjectByIdAndClient).mockResolvedValue({ id: 'p1' } as never);
      const session = { id: 's1', projectId: 'p1', status: 'CREATED', createdAt: new Date() };
      vi.mocked(sessionRepo.createSession).mockResolvedValue(session as never);
      vi.mocked(sessionRepo.updateSession).mockResolvedValue(session as never);

      const result = await sessionService.createSession({ projectId: 'p1', clientId: 'c1' });
      expect(result.id).toBe('s1');
      expect(sessionRepo.createSession).toHaveBeenCalled();
      expect(sessionRepo.updateSession).toHaveBeenCalled();
    });
  });

  describe('getSessionById', () => {
    it('returns null when session not found', async () => {
      vi.mocked(sessionRepo.findSessionWithProject).mockResolvedValue(null);
      const result = await sessionService.getSessionById('s1', 'c1');
      expect(result).toBeNull();
    });

    it('returns null when client mismatch', async () => {
      vi.mocked(sessionRepo.findSessionWithProject).mockResolvedValue({
        id: 's1',
        project: { id: 'p1', clientId: 'other' },
      } as never);
      const result = await sessionService.getSessionById('s1', 'c1');
      expect(result).toBeNull();
    });

    it('returns session when match', async () => {
      const session = { id: 's1', project: { id: 'p1', clientId: 'c1' } };
      vi.mocked(sessionRepo.findSessionWithProject).mockResolvedValue(session as never);
      const result = await sessionService.getSessionById('s1', 'c1');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('s1');
    });

    it('includes tasks when includeRelations true', async () => {
      const session = { id: 's1', project: { id: 'p1', clientId: 'c1' } };
      vi.mocked(sessionRepo.findSessionWithProject).mockResolvedValue(session as never);
      vi.mocked(sessionRepo.getTasksBySession).mockResolvedValue([{ id: 't1' }] as never);
      const result = await sessionService.getSessionById('s1', 'c1', true);
      expect((result as { tasks?: unknown[] })?.tasks).toHaveLength(1);
    });
  });

  describe('processNewTask', () => {
    it('throws SESSION_001 when session not found', async () => {
      vi.mocked(sessionRepo.findSessionById).mockResolvedValue(null);
      await expect(
        sessionService.processNewTask('s1', ['task'])
      ).rejects.toThrow(AppError);
    });

    it('throws SESSION_002 when session completed', async () => {
      vi.mocked(sessionRepo.findSessionById).mockResolvedValue({ id: 's1', status: 'COMPLETED' } as never);
      await expect(
        sessionService.processNewTask('s1', ['task'])
      ).rejects.toThrow(AppError);
    });

    it('returns context and tasks on success', async () => {
      const session = { id: 's1', status: 'ACTIVE' };
      const task = { id: 't1', type: 'ANALYZE', status: 'IN_PROGRESS', target: 'task', progress: 0 };
      vi.mocked(sessionRepo.findSessionById).mockResolvedValue(session as never);
      vi.mocked(sessionRepo.createTask).mockResolvedValue(task as never);
      vi.mocked(sessionRepo.updateTask).mockResolvedValue(task as never);
      vi.mocked(sessionRepo.updateSession).mockResolvedValue({} as never);
      vi.mocked(sessionRepo.createMessage).mockResolvedValue({} as never);

      const result = await sessionService.processNewTask('s1', ['do something']);
      expect(result.context).toBeDefined();
      expect(result.tasks).toHaveLength(1);
      expect(result.requestFiles).toBeDefined();
    });
  });

  describe('storeMessage', () => {
    it('calls createMessage', async () => {
      vi.mocked(sessionRepo.createMessage).mockResolvedValue({} as never);
      await sessionService.storeMessage('s1', 'CLIENT_TO_SERVER', { x: 1 });
      expect(sessionRepo.createMessage).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 's1', direction: 'CLIENT_TO_SERVER' })
      );
    });
  });

  describe('handleContinue', () => {
    it('throws SESSION_001 when session not found', async () => {
      vi.mocked(sessionRepo.findSessionById).mockResolvedValue(null);
      await expect(sessionService.handleContinue('s1')).rejects.toThrow(AppError);
    });

    it('returns context with continue flag', async () => {
      const ctx = { version: '1.0' as const, session_id: 's1' };
      vi.mocked(sessionRepo.findSessionById).mockResolvedValue({ context: ctx } as never);
      vi.mocked(sessionRepo.updateSession).mockResolvedValue({} as never);
      const result = await sessionService.handleContinue('s1');
      expect(result.continue).toBe(true);
    });
  });

  describe('handleConfirm', () => {
    it('throws SESSION_001 when session not found', async () => {
      vi.mocked(sessionRepo.findSessionById).mockResolvedValue(null);
      await expect(sessionService.handleConfirm('s1')).rejects.toThrow(AppError);
    });

    it('returns success and context with confirm flag', async () => {
      const ctx = { version: '1.0' as const, session_id: 's1' };
      vi.mocked(sessionRepo.findSessionById).mockResolvedValue({ context: ctx } as never);
      vi.mocked(sessionRepo.updateSession).mockResolvedValue({} as never);
      const result = await sessionService.handleConfirm('s1');
      expect(result.success).toBe(true);
      expect(result.context.confirm).toBe(true);
    });
  });

  describe('deleteSession', () => {
    it('calls sessionRepo.deleteSession', async () => {
      vi.mocked(sessionRepo.deleteSession).mockResolvedValue(undefined);
      await sessionService.deleteSession('s1');
      expect(sessionRepo.deleteSession).toHaveBeenCalledWith('s1');
    });
  });

  describe('updateSessionContext, updateSessionStatus', () => {
    it('updateSessionContext', async () => {
      const ctx = { version: '1.0' as const, session_id: 's1' };
      vi.mocked(sessionRepo.updateSession).mockResolvedValue({ id: 's1', context: ctx } as never);
      const result = await sessionService.updateSessionContext('s1', ctx);
      expect(result.context).toEqual(ctx);
    });

    it('updateSessionStatus', async () => {
      vi.mocked(sessionRepo.updateSession).mockResolvedValue({ id: 's1', status: 'COMPLETED' } as never);
      const result = await sessionService.updateSessionStatus('s1', 'COMPLETED');
      expect(result.status).toBe('COMPLETED');
    });
  });
});
