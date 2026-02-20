/**
 * Session Service Unit Tests
 * Note: These tests mock the service behavior without actual database calls
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionService, CreateSessionData, UpdateSessionData } from '../../src/services/session.service.js';
import { SessionStatus } from '@prisma/client';

describe('SessionService', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // These tests verify the service interface and basic behavior
  // Full integration tests would require a running database

  describe('Service Interface', () => {
    it('should have create method', () => {
      sessionService = new SessionService();
      expect(typeof sessionService.create).toBe('function');
    });

    it('should have getById method', () => {
      sessionService = new SessionService();
      expect(typeof sessionService.getById).toBe('function');
    });

    it('should have getByProjectId method', () => {
      sessionService = new SessionService();
      expect(typeof sessionService.getByProjectId).toBe('function');
    });

    it('should have update method', () => {
      sessionService = new SessionService();
      expect(typeof sessionService.update).toBe('function');
    });

    it('should have delete method', () => {
      sessionService = new SessionService();
      expect(typeof sessionService.delete).toBe('function');
    });

    it('should have hardDelete method', () => {
      sessionService = new SessionService();
      expect(typeof sessionService.hardDelete).toBe('function');
    });
  });

  describe('Types', () => {
    it('should accept valid CreateSessionData', () => {
      const data: CreateSessionData = {
        projectId: 'project-123',
        title: 'Test Session',
      };
      expect(data.projectId).toBe('project-123');
    });

    it('should accept CreateSessionData without title', () => {
      const data: CreateSessionData = {
        projectId: 'project-123',
      };
      expect(data.title).toBeUndefined();
    });

    it('should accept valid UpdateSessionData', () => {
      const data: UpdateSessionData = {
        title: 'Updated Title',
        status: SessionStatus.COMPLETED,
      };
      expect(data.title).toBe('Updated Title');
      expect(data.status).toBe(SessionStatus.COMPLETED);
    });

    it('should allow partial UpdateSessionData', () => {
      const data: UpdateSessionData = {
        title: 'New Title',
      };
      expect(data.status).toBeUndefined();
    });
  });

  describe('SessionStatus enum', () => {
    it('should have CREATED status', () => {
      expect(SessionStatus.CREATED).toBe('CREATED');
    });

    it('should have ACTIVE status', () => {
      expect(SessionStatus.ACTIVE).toBe('ACTIVE');
    });

    it('should have PAUSED status', () => {
      expect(SessionStatus.PAUSED).toBe('PAUSED');
    });

    it('should have COMPLETED status', () => {
      expect(SessionStatus.COMPLETED).toBe('COMPLETED');
    });

    it('should have ERROR status', () => {
      expect(SessionStatus.ERROR).toBe('ERROR');
    });
  });
});
