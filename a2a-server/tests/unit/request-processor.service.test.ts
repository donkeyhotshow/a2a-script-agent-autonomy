/**
 * Request Processor Service Unit Tests
 * No graph extraction. Neurons process context. Always completed (or failed on error).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { processOneRequest, stopRequestProcessor } from '../../src/services/request-processor.service.js';
import { requestService } from '../../src/services/request.service.js';

vi.mock('../../src/services/request.service.js');
vi.mock('../../src/utils/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const PROJECT_PATH = 'C:/workspace/domain-platform/websitestore.com.ua';

const baseRequest = {
  id: 'req-1',
  promiseId: 'prm-1',
  clientId: 'c1',
  status: 'pending' as const,
  priority: 0,
  message: null,
  result: null,
  error: null,
  createdAt: new Date(),
  startedAt: null,
  completedAt: null,
};

describe('Request Processor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    stopRequestProcessor();
  });

  it('1. returns null when no pending request', async () => {
    vi.mocked(requestService.getNextPending).mockResolvedValue(null);
    const outcome = await processOneRequest();
    expect(outcome).toBeNull();
  });

  it('2. returns completed (no graph_incomplete)', async () => {
    vi.mocked(requestService.getNextPending).mockResolvedValue({
      ...baseRequest,
      context: {},
      codeBlocks: null,
    });
    const outcome = await processOneRequest();
    expect(outcome).toBe('completed');
    expect(requestService.updateStatus).toHaveBeenCalledWith(
      'prm-1',
      'completed',
      expect.objectContaining({ outcome: 'completed', message: expect.stringContaining('placeholder') })
    );
  });

  it('3. returns completed with new_task (neurons process)', async () => {
    vi.mocked(requestService.getNextPending).mockResolvedValue({
      ...baseRequest,
      context: { project_path: PROJECT_PATH, new_task: ['Build graph'] },
      codeBlocks: null,
    });
    const outcome = await processOneRequest();
    expect(outcome).toBe('completed');
    expect(requestService.updateStatus).toHaveBeenCalledWith(
      'prm-1',
      'completed',
      expect.objectContaining({ outcome: 'completed', context: expect.any(Object) })
    );
  });

  it('4. returns completed with codeBlocks (no graph population)', async () => {
    const codeBlocks = [
      { path: 'app/Http/Controllers/Auth/RegisterController.php', content: '<?php class RegisterController extends Controller {}' },
      { path: 'app/Http/Requests/RegisterRequest.php', content: '<?php class RegisterRequest extends FormRequest {}' },
    ];
    vi.mocked(requestService.getNextPending).mockResolvedValue({
      ...baseRequest,
      context: { project_path: PROJECT_PATH, new_task: ['Build graph'] },
      codeBlocks,
    });
    const outcome = await processOneRequest();
    expect(outcome).toBe('completed');
    expect(requestService.updateStatus).toHaveBeenCalledWith('prm-1', 'completed', expect.objectContaining({ outcome: 'completed' }));
  });

  it('5. returns failed and updates status on error', async () => {
    vi.mocked(requestService.getNextPending).mockResolvedValue({
      ...baseRequest,
      context: { project_path: PROJECT_PATH },
      codeBlocks: null,
    });
    vi.mocked(requestService.updateStatus)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValue(true);
    const outcome = await processOneRequest();
    expect(outcome).toBe('failed');
    expect(requestService.updateStatus).toHaveBeenCalledWith('prm-1', 'failed', undefined, expect.objectContaining({ code: 'PROCESS_ERROR' }));
  });
});
