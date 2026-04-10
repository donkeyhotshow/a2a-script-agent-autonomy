/**
 * Request processor — minimal unit tests aligned with current routing (no legacy graph/entity layer).
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {processOneRequest, stopRequestProcessor} from '../../src/services/core/request-processor/request-processor.service.js';

const mockGetNextPending = vi.fn();
const mockUpdateStatus = vi.fn().mockResolvedValue(true);
const mockScheduleRetry = vi.fn().mockResolvedValue(false);
const mockCreate = vi.fn();

vi.mock('../../src/services/core/request/request.service.js', () => ({
    isRetryableError: () => false,
    requestService: {
        getNextPending: (...args: unknown[]) => mockGetNextPending(...args),
        updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
        scheduleRetry: (...args: unknown[]) => mockScheduleRetry(...args),
        create: (...args: unknown[]) => mockCreate(...args),
    },
}));

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

describe('Request processor service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        stopRequestProcessor();
    });

    it('returns null when queue is empty', async () => {
        mockGetNextPending.mockResolvedValue(null);
        const outcome = await processOneRequest();
        expect(outcome).toBeNull();
        expect(mockUpdateStatus).not.toHaveBeenCalled();
    });

    it('marks request failed when action queue has no task text', async () => {
        mockGetNextPending.mockResolvedValue({
            ...baseRequest,
            context: {},
            codeBlocks: null,
        });

        const result = await processOneRequest();

        expect(result?.outcome).toBe('failed');
        expect(mockUpdateStatus).toHaveBeenCalledWith(
            'prm-1',
            'failed',
            expect.objectContaining({
                error: expect.stringContaining('No task text'),
            })
        );
    });
});
