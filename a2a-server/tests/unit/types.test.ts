/**
 * Types Unit Tests
 */

import { describe, it, expect } from 'vitest';
import type {
  ContextBlock,
  Task,
  TaskType,
  TaskStatus,
  FileBlock,
  ClientMessage,
  ServerMessage,
  SearchQuery,
  SearchFilters,
  SearchResult,
  SearchMatch,
  ApiResponse,
  PaginatedResponse,
  WsEvent,
  WsEventType,
} from '../../src/types/index.js';

describe('Types', () => {
  describe('ContextBlock', () => {
    it('should create valid context block', () => {
      const context: ContextBlock = {
        version: '1.0',
        session_id: 'session-123',
        new_task: ['task1', 'task2'],
        architectural_features: ['laravel', 'vue'],
        continue: true,
        tasks: [
          {
            id: 'task-1',
            type: 'analyze',
            status: 'pending',
          },
        ],
        confirm: false,
      };

      expect(context.version).toBe('1.0');
      expect(context.session_id).toBe('session-123');
      expect(context.tasks).toHaveLength(1);
    });

    it('should allow optional fields', () => {
      const context: ContextBlock = {
        version: '1.0',
        session_id: 'session-123',
      };

      expect(context.new_task).toBeUndefined();
      expect(context.confirm).toBeUndefined();
    });
  });

  describe('Task', () => {
    it('should create valid task', () => {
      const task: Task = {
        id: 'task-1',
        type: 'analyze',
        status: 'in_progress',
        target: '/path/to/file',
        progress: 50,
      };

      expect(task.type).toBe('analyze');
      expect(task.status).toBe('in_progress');
    });

    it('should allow all task types', () => {
      const taskTypes: TaskType[] = ['analyze', 'refactor', 'test', 'document', 'fix', 'create', 'delete'];
      
      taskTypes.forEach(type => {
        const task: Task = { id: 'task-1', type, status: 'pending' };
        expect(task.type).toBe(type);
      });
    });

    it('should allow all task statuses', () => {
      const taskStatuses: TaskStatus[] = ['pending', 'in_progress', 'completed', 'failed', 'cancelled'];
      
      taskStatuses.forEach(status => {
        const task: Task = { id: 'task-1', type: 'analyze', status };
        expect(task.status).toBe(status);
      });
    });
  });

  describe('FileBlock', () => {
    it('should create valid file block', () => {
      const file: FileBlock = {
        path: '/src/app.ts',
        content: 'console.log("hello")',
        startLine: 1,
        endLine: 10,
      };

      expect(file.path).toBe('/src/app.ts');
      expect(file.startLine).toBe(1);
    });

    it('should allow optional line range', () => {
      const file: FileBlock = {
        path: '/src/app.ts',
        content: 'console.log("hello")',
      };

      expect(file.startLine).toBeUndefined();
      expect(file.endLine).toBeUndefined();
    });
  });

  describe('ClientMessage & ServerMessage', () => {
    it('should create valid client message', () => {
      const message: ClientMessage = {
        context: {
          version: '1.0',
          session_id: 'session-123',
        },
        files: [
          {
            path: '/src/app.ts',
            content: 'console.log("hello")',
          },
        ],
      };

      expect(message.context).toBeDefined();
      expect(message.files).toHaveLength(1);
    });

    it('should create valid server message', () => {
      const message: ServerMessage = {
        context: {
          version: '1.0',
          session_id: 'session-123',
        },
        message: 'Processing complete',
      };

      expect(message.message).toBe('Processing complete');
    });
  });

  describe('Search Types', () => {
    it('should create valid search query', () => {
      const query: SearchQuery = {
        query: 'find auth middleware',
        filters: {
          file_types: ['ts', 'js'],
          directories: ['src'],
        },
        options: {
          limit: 10,
          min_score: 0.5,
        },
      };

      expect(query.query).toBe('find auth middleware');
      expect(query.filters?.file_types).toEqual(['ts', 'js']);
    });

    it('should create valid search filters', () => {
      const filters: SearchFilters = {
        file_types: ['php'],
        directories: ['app/Http'],
        framework: 'laravel',
        exclude: ['vendor', 'node_modules'],
      };

      expect(filters.framework).toBe('laravel');
    });

    it('should create valid search result', () => {
      const result: SearchResult = {
        results: [
          {
            file: '/src/auth.ts',
            score: 0.95,
            matches: [
              {
                line_start: 10,
                line_end: 15,
                content: 'export function authenticate()',
                highlight: '<em>authenticate</em>',
                context_score: 0.9,
              },
            ],
            metadata: {
              framework: 'laravel',
              type: 'middleware',
              last_modified: '2024-01-01',
            },
          },
        ],
        total: 1,
        query_time_ms: 50,
        algorithm_used: 'hybrid',
      };

      expect(result.total).toBe(1);
      expect(result.results[0].score).toBe(0.95);
    });
  });

  describe('API Response Types', () => {
    it('should create valid success response', () => {
      const response: ApiResponse<string> = {
        success: true,
        data: 'result',
      };

      expect(response.success).toBe(true);
      expect(response.data).toBe('result');
    });

    it('should create valid error response', () => {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Unauthorized',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('AUTH_001');
    });

    it('should create valid paginated response', () => {
      const response: PaginatedResponse<string> = {
        items: ['item1', 'item2', 'item3'],
        total: 10,
        page: 2,
        per_page: 3,
      };

      expect(response.items).toHaveLength(3);
      expect(response.total).toBe(10);
      expect(response.page).toBe(2);
    });
  });

  describe('WebSocket Event Types', () => {
    it('should create valid ws event', () => {
      const event: WsEvent = {
        type: 'task:progress',
        payload: {
          task_id: 'task-1',
          progress: 50,
          status: 'in_progress',
        },
        timestamp: new Date(),
      };

      expect(event.type).toBe('task:progress');
    });

    it('should allow all event types', () => {
      const eventTypes: WsEventType[] = [
        'task:progress',
        'task:completed',
        'files:updated',
        'files:requested',
        'error',
      ];

      eventTypes.forEach(type => {
        const event: WsEvent = {
          type,
          payload: {},
          timestamp: new Date(),
        };
        expect(event.type).toBe(type);
      });
    });
  });
});
