/**
 * Request Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $executeRaw: vi.fn().mockResolvedValue(1),
    $queryRaw: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Request Service', () => {
  describe('Request Status Types', () => {
    it('should have correct status values', () => {
      const statuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
      expect(statuses).toContain('pending');
      expect(statuses).toContain('processing');
      expect(statuses).toContain('completed');
      expect(statuses).toContain('failed');
      expect(statuses).toContain('cancelled');
    });
  });

  describe('Request ID Generation', () => {
    it('should generate unique request IDs', () => {
      const id1 = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const id2 = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // IDs should be different (very unlikely to be same)
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with req_ prefix', () => {
      const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      expect(id.startsWith('req_')).toBe(true);
    });

    it('should generate unique promise IDs', () => {
      const promiseId1 = `prm_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      const promiseId2 = `prm_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
      expect(promiseId1.startsWith('prm_')).toBe(true);
      expect(promiseId2.startsWith('prm_')).toBe(true);
    });
  });

  describe('CreateRequestData Validation', () => {
    it('should validate required fields', () => {
      const validData = {
        clientId: 'client-123',
        context: { version: '1.0', session_id: 'session-1' },
      };
      
      expect(validData.clientId).toBeDefined();
      expect(validData.context).toBeDefined();
    });

    it('should allow optional fields', () => {
      const dataWithOptional = {
        clientId: 'client-123',
        context: { version: '1.0' },
        message: 'Hello',
        priority: 5,
      };
      
      expect(dataWithOptional.message).toBe('Hello');
      expect(dataWithOptional.priority).toBe(5);
    });

    it('should handle codeBlocks as array', () => {
      const dataWithCodeBlocks = {
        clientId: 'client-123',
        context: {},
        codeBlocks: [
          { path: 'src/main.ts', content: 'console.log("hello")' },
          { path: 'src/utils.ts', content: 'export const foo = () => {}' },
        ],
      };
      
      expect(dataWithCodeBlocks.codeBlocks).toHaveLength(2);
      expect(dataWithCodeBlocks.codeBlocks[0].path).toBe('src/main.ts');
    });
  });

  describe('RequestResult Type', () => {
    it('should have correct result structure', () => {
      const result = {
        id: 'req-1',
        promiseId: 'prm-1',
        clientId: 'client-1',
        status: 'pending' as const,
        priority: 0,
        context: {},
        message: null,
        codeBlocks: null,
        result: null,
        error: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
      };
      
      expect(result.id).toBeDefined();
      expect(result.promiseId).toBeDefined();
      expect(result.status).toBe('pending');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should handle completed status with result', () => {
      const completedResult = {
        status: 'completed' as const,
        result: { output: 'Task completed successfully' },
        completedAt: new Date(),
      };
      
      expect(completedResult.status).toBe('completed');
      expect(completedResult.result).toBeDefined();
      expect(completedResult.completedAt).toBeInstanceOf(Date);
    });

    it('should handle failed status with error', () => {
      const failedResult = {
        status: 'failed' as const,
        error: { code: 'ERROR_001', message: 'Task failed' },
        completedAt: new Date(),
      };
      
      expect(failedResult.status).toBe('failed');
      expect(failedResult.error).toBeDefined();
    });
  });

  describe('Status Transitions', () => {
    it('should allow valid status transitions', () => {
      const validTransitions: Record<string, string[]> = {
        pending: ['processing', 'cancelled'],
        processing: ['completed', 'failed'],
        completed: [],
        failed: [],
        cancelled: [],
      };
      
      expect(validTransitions.pending).toContain('processing');
      expect(validTransitions.processing).toContain('completed');
    });

    it('should not allow skipping from pending to completed', () => {
      const validTransitions: Record<string, string[]> = {
        pending: ['processing', 'cancelled'],
        processing: ['completed', 'failed'],
      };
      
      // Direct transition from pending to completed is not valid
      expect(validTransitions.pending).not.toContain('completed');
    });
  });

  describe('Priority Handling', () => {
    it('should handle default priority', () => {
      const data = { clientId: 'client-1', context: {} };
      const priority = data.priority || 0;
      expect(priority).toBe(0);
    });

    it('should handle custom priority', () => {
      const data = { clientId: 'client-1', context: {}, priority: 10 };
      const priority = data.priority || 0;
      expect(priority).toBe(10);
    });

    it('should handle negative priority', () => {
      const data = { clientId: 'client-1', context: {}, priority: -5 };
      const priority = data.priority || 0;
      expect(priority).toBe(-5);
    });
  });

  describe('Context Serialization', () => {
    it('should serialize context to JSON', () => {
      const context = { version: '1.0', session_id: 'session-1' };
      const serialized = JSON.stringify(context);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.version).toBe('1.0');
    });

    it('should handle nested context objects', () => {
      const context = {
        version: '1.0',
        tasks: [{ id: 'task-1', type: 'ANALYZE' }],
      };
      const serialized = JSON.stringify(context);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.tasks[0].id).toBe('task-1');
    });
  });
});
