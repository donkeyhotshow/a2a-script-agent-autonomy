/**
 * Request processor — minimal unit tests aligned with current routing (no legacy graph/entity layer).
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
    determineRequestType,
    processOneRequest,
    stopRequestProcessor,
} from '../../src/services/core/request-processor/request-processor.service';

const mockGetNextPending = vi.fn();
const mockUpdateStatus = vi.fn().mockResolvedValue(true);
const mockScheduleRetry = vi.fn().mockResolvedValue(false);
const mockCreate = vi.fn();

vi.mock('../../src/services/core/request/request.service', () => ({
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

    it('determineRequestType routes by context shape (table)', () => {
        const cases: Array<{ctx: Record<string, unknown>; want: string}> = [
            {ctx: {simulation: true}, want: 'simulation'},
            {
                ctx: {execution: {step: 'new', action: 'task'}, task: 'do something'},
                want: 'action',
            },
            {
                ctx: {
                    execution: {step: 'router'},
                    result: {choice: 'dialog'},
                },
                want: 'action',
            },
            {
                ctx: {transformSchema: 'dialog-request'},
                want: 'dialog',
            },
            {
                ctx: {
                    execution: {action: 'dialog', step: 'x'},
                    result: {message: 'hello'},
                },
                want: 'dialog',
            },
            {
                ctx: {
                    execution: {step: 'new', action: 'agent'},
                    task: 'hi',
                    result: {choice: 'agent'},
                },
                want: 'dialog',
            },
            {
                ctx: {form_submission: true, execution: {step: 'other'}},
                want: 'form',
            },
            {ctx: {task: 'only-task'}, want: 'action'},
        ];
        for (const {ctx, want} of cases) {
            expect(determineRequestType(ctx), JSON.stringify(ctx)).toBe(want);
        }
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
