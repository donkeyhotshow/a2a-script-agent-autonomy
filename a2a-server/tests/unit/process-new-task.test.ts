/**
 * processNewTaskToContext Unit Tests
 * Verifies neurons, request_files flow
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { registerBaseNeurons } from '../../src/knowledge/neurons/base/index.js';
import { processNewTaskToContext } from '../../src/knowledge/context-handler.js';

beforeAll(() => registerBaseNeurons());

describe('processNewTaskToContext', () => {
  it('returns context unchanged when no new_task', () => {
    const ctx = { project_path: '/x', tasks: [] };
    expect(processNewTaskToContext(ctx, [])).toEqual(ctx);
  });

  it('moves new_task to tasks', () => {
    const ctx = { project_path: '/x', new_task: ['Add validation'] };
    const out = processNewTaskToContext(ctx, []);
    expect(out.new_task).toEqual([]);
    expect((out.tasks as unknown[])).toHaveLength(1);
    expect((out.tasks as { target: string }[])[0].target).toBe('Add validation');
  });

  it('adds request_files when neurons activate', () => {
    const codeBlocks = [
      { path: 'app/Models/User.php', content: '<?php class User extends Model { use HasFactory; }' },
    ];
    const ctx = { project_path: '/x', new_task: ['Fix model'] };
    const out = processNewTaskToContext(ctx, codeBlocks);
    expect(out.request_files).toBeDefined();
    expect((out.request_files as string[]).length).toBeGreaterThan(0);
  });
});
