import { describe, it, expect } from 'vitest';
import {
  validateContextBlock,
  parseContextBlock,
  parseContextBlockSafe,
  extractNewTask,
  extractRequestedFiles,
  extractArchitecturalFeatures,
  parseTasks,
  hasContinueFlag,
  hasConfirmFlag,
  createInitialContext,
  createNewTaskContext,
  createFileRequestContext,
  updateTaskProgress,
  addTaskToContext,
  removeTaskFromContext,
  addErrorToContext,
  clearErrorsFromContext,
  serializeContext,
  deserializeContext,
  deserializeContextSafe,
  mergeContexts,
  cloneContext,
  hasActiveTasks,
  getTaskById,
  getTasksByStatus,
  calculateOverallProgress,
} from '../../../src/protocol/context-parser.js';

describe('context-parser', () => {
  const validContext = {
    version: '1.0',
    session_id: 's1',
  };

  describe('validateContextBlock', () => {
    it('rejects non-object', () => {
      expect(validateContextBlock(null).valid).toBe(false);
      expect(validateContextBlock('x').valid).toBe(false);
      expect(validateContextBlock([]).valid).toBe(false);
    });

    it('requires version and session_id', () => {
      expect(validateContextBlock({}).errors).toContain('version is required and must be a string');
      expect(validateContextBlock({ version: '1.0' }).errors).toContain('session_id is required and must be a string');
    });

    it('requires version 1.0', () => {
      const r = validateContextBlock({ version: '2.0', session_id: 's1' });
      expect(r.valid).toBe(false);
      expect(r.errors.some((e) => e.includes('1.0'))).toBe(true);
    });

    it('validates optional fields', () => {
      expect(validateContextBlock({ ...validContext, new_task: 'x' }).valid).toBe(false);
      expect(validateContextBlock({ ...validContext, continue: 'yes' }).valid).toBe(false);
      expect(validateContextBlock({ ...validContext, tasks: [{ id: '', type: 'analyze', status: 'pending' }] }).valid).toBe(false);
    });

    it('accepts valid context', () => {
      expect(validateContextBlock(validContext).valid).toBe(true);
    });
  });

  describe('parseContextBlock', () => {
    it('throws on invalid', () => {
      expect(() => parseContextBlock(null)).toThrow();
    });

    it('parses valid context', () => {
      const ctx = parseContextBlock(validContext);
      expect(ctx.version).toBe('1.0');
      expect(ctx.session_id).toBe('s1');
    });

    it('parses optional fields', () => {
      const full = { ...validContext, new_task: ['a'], continue: true, tasks: [{ id: 't1', type: 'analyze', status: 'pending', progress: 0 }] };
      const ctx = parseContextBlock(full);
      expect(ctx.new_task).toEqual(['a']);
      expect(ctx.continue).toBe(true);
      expect(ctx.tasks).toHaveLength(1);
    });
  });

  describe('parseContextBlockSafe', () => {
    it('returns null on error', () => {
      expect(parseContextBlockSafe(null)).toBeNull();
    });
    it('returns parsed on success', () => {
      expect(parseContextBlockSafe(validContext)?.session_id).toBe('s1');
    });
  });

  describe('extract*', () => {
    it('extractNewTask returns null when empty', () => {
      expect(extractNewTask(validContext as never)).toBeNull();
    });
    it('extractNewTask returns array', () => {
      expect(extractNewTask({ ...validContext, new_task: ['a'] } as never)).toEqual(['a']);
    });
    it('extractRequestedFiles', () => {
      expect(extractRequestedFiles(validContext as never)).toBeNull();
      expect(extractRequestedFiles({ ...validContext, request_files: ['x'] } as never)).toEqual(['x']);
    });
    it('extractArchitecturalFeatures', () => {
      expect(extractArchitecturalFeatures({ ...validContext, architectural_features: ['auth'] } as never)).toEqual(['auth']);
    });
  });

  describe('parseTasks, hasContinueFlag, hasConfirmFlag', () => {
    it('parseTasks returns empty by default', () => {
      expect(parseTasks(validContext as never)).toEqual([]);
    });
    it('hasContinueFlag', () => {
      expect(hasContinueFlag(validContext as never)).toBe(false);
      expect(hasContinueFlag({ ...validContext, continue: true } as never)).toBe(true);
    });
    it('hasConfirmFlag', () => {
      expect(hasConfirmFlag({ ...validContext, confirm: true } as never)).toBe(true);
    });
  });

  describe('create*', () => {
    it('createInitialContext', () => {
      const ctx = createInitialContext('s1');
      expect(ctx.version).toBe('1.0');
      expect(ctx.session_id).toBe('s1');
    });
    it('createNewTaskContext', () => {
      const ctx = createNewTaskContext('s1', ['task1'], ['auth']);
      expect(ctx.new_task).toEqual(['task1']);
      expect(ctx.architectural_features).toEqual(['auth']);
    });
    it('createFileRequestContext', () => {
      const ctx = createFileRequestContext('s1', ['a.ts']);
      expect(ctx.request_files).toEqual(['a.ts']);
    });
  });

  describe('updateTaskProgress', () => {
    it('updates task progress', () => {
      const ctx = { ...validContext, tasks: [{ id: 't1', type: 'analyze', status: 'in_progress', progress: 50 }] } as never;
      const out = updateTaskProgress(ctx, 't1', 75, 'completed');
      expect(out.tasks?.[0]?.progress).toBe(75);
      expect(out.tasks?.[0]?.status).toBe('completed');
    });
    it('clamps progress 0-100', () => {
      const ctx = { ...validContext, tasks: [{ id: 't1', type: 'analyze', status: 'pending', progress: 0 }] } as never;
      const out = updateTaskProgress(ctx, 't1', 150, 'in_progress');
      expect(out.tasks?.[0]?.progress).toBe(100);
    });
  });

  describe('addTaskToContext, removeTaskFromContext', () => {
    it('addTaskToContext', () => {
      const ctx = createInitialContext('s1');
      const out = addTaskToContext(ctx, 'analyze', 'target');
      expect(out.tasks).toHaveLength(1);
      expect(out.tasks?.[0]?.type).toBe('analyze');
      expect(out.tasks?.[0]?.target).toBe('target');
    });
    it('removeTaskFromContext', () => {
      const ctx = addTaskToContext(createInitialContext('s1'), 'analyze');
      const id = ctx.tasks![0]!.id;
      const out = removeTaskFromContext(ctx, id);
      expect(out.tasks).toHaveLength(0);
    });
  });

  describe('addErrorToContext, clearErrorsFromContext', () => {
    it('addErrorToContext', () => {
      const ctx = createInitialContext('s1');
      const out = addErrorToContext(ctx, { code: 'E1', message: 'err' });
      expect(out.errors).toHaveLength(1);
      expect(out.errors?.[0]?.code).toBe('E1');
    });
    it('clearErrorsFromContext', () => {
      const ctx = addErrorToContext(createInitialContext('s1'), { code: 'E1', message: 'err' });
      const out = clearErrorsFromContext(ctx);
      expect(out.errors).toBeUndefined();
    });
  });

  describe('serializeContext, deserializeContext', () => {
    it('round-trip', () => {
      const ctx = createInitialContext('s1');
      const str = serializeContext(ctx);
      const parsed = deserializeContext(str);
      expect(parsed.session_id).toBe(ctx.session_id);
    });
    it('deserializeContextSafe returns null on invalid', () => {
      expect(deserializeContextSafe('{invalid')).toBeNull();
    });
  });

  describe('mergeContexts, cloneContext', () => {
    it('mergeContexts', () => {
      const base = createInitialContext('s1');
      const merged = mergeContexts(base, { continue: true });
      expect(merged.continue).toBe(true);
      expect(merged.version).toBe('1.0');
    });
    it('cloneContext', () => {
      const ctx = createInitialContext('s1');
      const cloned = cloneContext(ctx);
      expect(cloned).not.toBe(ctx);
      expect(cloned.session_id).toBe(ctx.session_id);
    });
  });

  describe('hasActiveTasks, getTaskById, getTasksByStatus, calculateOverallProgress', () => {
    it('hasActiveTasks', () => {
      const ctx = { ...validContext, tasks: [{ id: 't1', type: 'analyze', status: 'in_progress', progress: 50 }] } as never;
      expect(hasActiveTasks(ctx)).toBe(true);
      const completed = { ...validContext, tasks: [{ id: 't1', type: 'analyze', status: 'completed', progress: 100 }] } as never;
      expect(hasActiveTasks(completed)).toBe(false);
    });
    it('getTaskById', () => {
      const ctx = { ...validContext, tasks: [{ id: 't1', type: 'analyze', status: 'pending', progress: 0 }] } as never;
      expect(getTaskById(ctx, 't1')?.id).toBe('t1');
      expect(getTaskById(ctx, 'missing')).toBeNull();
    });
    it('getTasksByStatus', () => {
      const ctx = { ...validContext, tasks: [{ id: 't1', type: 'analyze', status: 'completed', progress: 100 }, { id: 't2', type: 'fix', status: 'pending', progress: 0 }] } as never;
      expect(getTasksByStatus(ctx, 'completed')).toHaveLength(1);
    });
    it('calculateOverallProgress', () => {
      const ctx = { ...validContext, tasks: [{ id: 't1', type: 'analyze', status: 'in_progress', progress: 50 }, { id: 't2', type: 'fix', status: 'in_progress', progress: 100 }] } as never;
      expect(calculateOverallProgress(ctx)).toBe(75);
      expect(calculateOverallProgress(validContext as never)).toBe(0);
    });
  });
});
