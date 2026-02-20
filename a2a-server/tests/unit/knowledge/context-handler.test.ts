import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createSessionContext,
  getSessionContext,
  updateSessionContext,
  deleteSessionContext,
  handleRootContext,
  handleContext,
  handleNewTask,
  requestFiles,
  continueExecution,
  confirmAction,
  applyShadowing,
  registerProjectContext,
  restoreNeuronSequence,
  getActiveNeurons,
  hasSession,
  getAllSessionIds,
  clearAllSessions,
  type RootContext,
  type FileMasks,
  type ActiveActions,
} from '../../../src/knowledge/context-handler.js';
import { getContextBlock, clearContextBlocks } from '../../../src/knowledge/context-store.js';

describe('context-handler', () => {
  const sessionId = 'test-session-123';
  const projectId = 'test-project-456';

  beforeEach(() => {
    clearAllSessions();
  });

  afterEach(() => {
    clearAllSessions();
    clearContextBlocks();
  });

  describe('session management', () => {
    it('creates session context', () => {
      const session = createSessionContext(sessionId, projectId);
      
      expect(session.sessionId).toBe(sessionId);
      expect(session.projectId).toBe(projectId);
      expect(session.context.version).toBe('1.0');
      expect(session.context.session_id).toBe(sessionId);
      expect(session.activatedNeurons).toEqual([]);
      expect(session.history).toEqual([]);
    });

    it('gets session context', () => {
      createSessionContext(sessionId, projectId);
      const session = getSessionContext(sessionId);
      
      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe(sessionId);
    });

    it('returns null for non-existent session', () => {
      const session = getSessionContext('non-existent');
      expect(session).toBeNull();
    });

    it('updates session context', () => {
      createSessionContext(sessionId, projectId);
      const updated = updateSessionContext(sessionId, {
        context: { version: '1.0', session_id: sessionId, continue: true },
      });
      
      expect(updated).not.toBeNull();
      expect(updated?.context.continue).toBe(true);
    });

    it('deletes session context', () => {
      createSessionContext(sessionId, projectId);
      expect(hasSession(sessionId)).toBe(true);
      
      const deleted = deleteSessionContext(sessionId);
      expect(deleted).toBe(true);
      expect(hasSession(sessionId)).toBe(false);
    });

    it('checks if session exists', () => {
      expect(hasSession(sessionId)).toBe(false);
      createSessionContext(sessionId, projectId);
      expect(hasSession(sessionId)).toBe(true);
    });
  });

  describe('handleRootContext', () => {
    const rootContext: RootContext = {
      projectName: 'Test Project',
      projectType: 'laravel-vue',
      detectedAt: '2026-02-20T00:00:00Z',
      adrs: [
        {
          id: 'adr-001',
          title: 'Use Inertia.js for SPA',
          status: 'accepted',
          date: '2024-01-15',
          context: 'Need SPA without separate API',
          decision: 'Use Inertia.js with Vue 3',
        },
      ],
      directoryTree: [
        { name: 'app', type: 'directory', path: 'app', children: [
          { name: 'Models', type: 'directory', path: 'app/Models' },
          { name: 'Http', type: 'directory', path: 'app/Http' },
        ]},
        { name: 'resources', type: 'directory', path: 'resources', children: [
          { name: 'js', type: 'directory', path: 'resources/js' },
          { name: 'views', type: 'directory', path: 'resources/views' },
        ]},
        { name: 'routes', type: 'directory', path: 'routes' },
        { name: 'composer.json', type: 'file', path: 'composer.json' },
        { name: 'package.json', type: 'file', path: 'package.json' },
      ],
      frameworks: {
        frontend: ['vue@3.5.0'],
        backend: ['laravel@11.0'],
      },
      libraries: {
        state: ['pinia@3.0.4'],
        styling: ['tailwindcss@4.1.18'],
      },
      architecture: {
        type: 'feature-first',
        patterns: ['mvc', 'service-layer'],
        structure: {
          frontend: 'resources/js',
          backend: 'app',
        },
      },
    };

    it('handles root context and activates neurons', () => {
      createSessionContext(sessionId, projectId);
      
      const result = handleRootContext(sessionId, rootContext);
      
      expect(result.context.session_id).toBe(sessionId);
      expect(result.context.architectural_features).toContain('vue@3.5.0');
      expect(result.context.architectural_features).toContain('laravel@11.0');
      expect(result.activatedNeurons).toBeDefined();
    });

    it('throws error for non-existent session', () => {
      expect(() => handleRootContext('non-existent', rootContext)).toThrow(
        'Session not found: non-existent'
      );
    });

    it('includes file masks in activation', () => {
      createSessionContext(sessionId, projectId);
      
      const fileMasks: FileMasks = {
        projectName: 'Test Project',
        updatedAt: '2026-02-20T00:00:00Z',
        masks: {
          'vue-components': {
            pattern: 'resources/js/**/*.vue',
            exclude: [],
            purpose: 'Vue components',
          },
        },
      };
      
      const result = handleRootContext(sessionId, rootContext, fileMasks);
      expect(result).toBeDefined();
    });

    it('includes active actions in result', () => {
      createSessionContext(sessionId, projectId);
      
      const activeActions: ActiveActions = {
        projectName: 'Test Project',
        updatedAt: '2026-02-20T00:00:00Z',
        totalActions: 1,
        actions: [
          {
            actionId: 'detect-n-plus-one',
            categoryId: 'laravel-query',
            executorSystemId: 'script',
            enabled: true,
            reason: 'Laravel detected',
            priority: 'high',
          },
        ],
      };
      
      const result = handleRootContext(sessionId, rootContext, undefined, activeActions);
      expect(result.actions).toBeDefined();
      expect(result.actions).toHaveLength(1);
    });
  });

  describe('handleContext', () => {
    it('handles incoming context with files', () => {
      createSessionContext(sessionId, projectId);
      
      const incomingContext = {
        version: '1.0' as const,
        session_id: sessionId,
        new_task: ['implement feature'],
      };
      
      const files = [
        { path: 'app/Models/User.php', content: '<?php class User {}' },
      ];
      
      const result = handleContext(sessionId, incomingContext, files);
      
      expect(result.context.new_task).toEqual(['implement feature']);
      expect(result.activatedNeurons).toBeDefined();
    });

    it('merges context with existing', () => {
      createSessionContext(sessionId, projectId);
      
      // First update
      handleContext(sessionId, {
        version: '1.0',
        session_id: sessionId,
        architectural_features: ['vue'],
      });
      
      // Second update
      const result = handleContext(sessionId, {
        version: '1.0',
        session_id: sessionId,
        continue: true,
      });
      
      expect(result.context.architectural_features).toContain('vue');
      expect(result.context.continue).toBe(true);
    });
  });

  describe('handleNewTask', () => {
    it('handles new tasks', () => {
      createSessionContext(sessionId, projectId);
      
      const result = handleNewTask(sessionId, ['implement login', 'add tests']);
      
      expect(result.context.new_task).toEqual(['implement login', 'add tests']);
      expect(result.context.tasks).toBeDefined();
      expect(result.context.tasks).toHaveLength(2);
    });

    it('infers task types correctly', () => {
      createSessionContext(sessionId, projectId);
      
      const result = handleNewTask(sessionId, [
        'test the feature',
        'fix the bug',
        'create new component',
        'refactor code',
        'document API',
        'delete old files',
        'analyze performance',
      ]);
      
      const tasks = result.context.tasks!;
      expect(tasks[0]?.type).toBe('test');
      expect(tasks[1]?.type).toBe('fix');
      expect(tasks[2]?.type).toBe('create');
      expect(tasks[3]?.type).toBe('refactor');
      expect(tasks[4]?.type).toBe('document');
      expect(tasks[5]?.type).toBe('delete');
      expect(tasks[6]?.type).toBe('analyze');
    });

    it('includes architectural features', () => {
      createSessionContext(sessionId, projectId);
      
      const result = handleNewTask(
        sessionId,
        ['implement feature'],
        ['laravel', 'vue']
      );
      
      expect(result.context.architectural_features).toEqual(['laravel', 'vue']);
    });
  });

  describe('requestFiles', () => {
    it('creates file request context', () => {
      createSessionContext(sessionId, projectId);
      
      const context = requestFiles(sessionId, [
        'app/Models/User.php',
        'app/Http/Controllers/UserController.php',
      ]);
      
      expect(context.request_files).toEqual([
        'app/Models/User.php',
        'app/Http/Controllers/UserController.php',
      ]);
    });
  });

  describe('continueExecution', () => {
    it('sets continue flag', () => {
      createSessionContext(sessionId, projectId);
      
      const result = continueExecution(sessionId);
      
      expect(result.context.continue).toBe(true);
    });
  });

  describe('confirmAction', () => {
    it('sets confirm flag', () => {
      createSessionContext(sessionId, projectId);
      
      const result = confirmAction(sessionId);
      
      expect(result.context.confirm).toBe(true);
    });
  });

  describe('applyShadowing', () => {
    it('applies project standards over neuron defaults', () => {
      const neuronDefaults = {
        'naming-convention': 'camelCase',
        'test-location': 'tests/',
      };
      
      const projectStandards = {
        'naming-convention': 'snake_case',
        'custom-rule': 'value',
      };
      
      const result = applyShadowing(projectStandards, neuronDefaults);
      
      expect(result['naming-convention']).toBe('snake_case'); // Overridden
      expect(result['test-location']).toBe('tests/'); // Kept from defaults
      expect(result['custom-rule']).toBe('value'); // Added from project
    });
  });

  describe('restoreNeuronSequence', () => {
    it('restores neurons from session', () => {
      createSessionContext(sessionId, projectId);
      handleRootContext(sessionId, {
        projectName: 'Test',
        projectType: 'laravel',
        detectedAt: '2026-02-20T00:00:00Z',
        adrs: [],
        directoryTree: [
          { name: 'app', type: 'directory', path: 'app' },
          { name: 'routes', type: 'directory', path: 'routes' },
        ],
        frameworks: { backend: ['laravel@11.0'] },
        libraries: {},
        architecture: { type: 'standard', patterns: [], structure: {} },
      });
      
      const neurons = restoreNeuronSequence(sessionId);
      expect(neurons).toBeDefined();
    });

    it('returns empty array for non-existent session', () => {
      const neurons = restoreNeuronSequence('non-existent');
      expect(neurons).toEqual([]);
    });
  });

  describe('getActiveNeurons', () => {
    it('returns active neurons for session', () => {
      createSessionContext(sessionId, projectId);
      
      const neurons = getActiveNeurons(sessionId);
      expect(neurons).toEqual([]);
    });

    it('returns empty array for non-existent session', () => {
      const neurons = getActiveNeurons('non-existent');
      expect(neurons).toEqual([]);
    });
  });

  describe('getAllSessionIds', () => {
    it('returns empty when no sessions', () => {
      expect(getAllSessionIds()).toEqual([]);
    });
    it('returns all session ids', () => {
      createSessionContext('s1', projectId);
      createSessionContext('s2', projectId);
      const ids = getAllSessionIds();
      expect(ids).toContain('s1');
      expect(ids).toContain('s2');
      expect(ids).toHaveLength(2);
    });
  });

  describe('registerProjectContext', () => {
    it('registers project context block', () => {
      registerProjectContext(projectId, 'custom-rule', 'content');
      const content = getContextBlock(`project-${projectId}-custom-rule`);
      expect(content).toBe('content');
    });
  });
});
