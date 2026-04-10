/**
 * Invoke privacy: session_id is not part of invoke context contract.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { createMock } = vi.hoisted(() => ({
  createMock: vi.fn().mockResolvedValue({ promiseId: 'prom_ut_sess', id: 'req_ut_sess' }),
}));

vi.mock('../../src/services/core/request/request.service.js', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../src/services/core/request/request.service.js')>();
  return {
    ...mod,
    requestService: {
      ...mod.requestService,
      create: createMock,
    },
  };
});

import { invoke } from '../../src/services/utils/invoke.service.js';

describe('invoke — session_id privacy', () => {
  beforeEach(() => {
    createMock.mockClear();
  });

  it('strips client storage-style session_id', async () => {
    await invoke('ut', {
      context: {
        session_id: 'sess_CLIENT_STORAGE_PROBE_7a2f',
        execution: { action: 'task', step: 'new' },
        task: 'probe',
      },
      result: { message: 'probe' },
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    const ctx = createMock.mock.calls[0][0].context as Record<string, unknown>;
    expect(ctx.session_id).toBeUndefined();
    expect(ctx.version).toBeUndefined();
  });

  it('does not preserve client-provided srv_sess_* ids', async () => {
    const stable = 'srv_sess_11111111-1111-1111-1111-111111111111';
    await invoke('ut', {
      context: {
        session_id: stable,
        execution: { action: 'task', step: 'router' },
        task: 'x',
      },
      result: { message: 'x' },
    });
    const ctx = createMock.mock.calls[0][0].context as Record<string, unknown>;
    expect(ctx.session_id).toBeUndefined();
    expect(ctx.version).toBeUndefined();
  });

  it('strips context.sessionId before persisting (camelCase storage id)', async () => {
    await invoke('ut', {
      context: {
        session_id: 'stateless',
        sessionId: 'sess_CAMEL_SHOULD_NOT_PERSIST_9zz',
        execution: { action: 'task', step: 'new' },
        task: 'probe',
      },
      result: { message: 'probe' },
    });
    const ctx = createMock.mock.calls[0][0].context as Record<string, unknown>;
    expect(ctx.sessionId).toBeUndefined();
    expect(ctx.session_id).toBeUndefined();
    expect(ctx.version).toBeUndefined();
  });
});
