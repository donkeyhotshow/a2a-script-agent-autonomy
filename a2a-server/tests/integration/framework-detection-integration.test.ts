/**
 * Framework Detection Integration Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as processorService from '../../src/services/core/request-processor/request-processor.service.js';
import { requestService } from '../../src/services/core/request/request.service.js';

// Mock requestService.updateStatus to capture results
vi.mock('../../src/services/core/request/request.service.js', () => ({
    requestService: {
        updateStatus: vi.fn().mockResolvedValue(true),
        getNextPending: vi.fn(),
        claimPendingByPromiseId: vi.fn(),
    }
}));

// Mock the actual routing to avoid side effects
vi.mock('../../src/services/core/request-processor/index.js', async (importOriginal) => {
    const actual = await importOriginal() as any;
    return {
        ...actual,
        actionRequestProcessor: {
            process: vi.fn().mockResolvedValue({ outcome: 'completed', message: 'Action mock called' })
        }
    };
});

describe('Framework Detection Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should detect frameworks from codeBlocks and add to context', async () => {
        const promiseId = 'test-promise-id';
        const context = { session_id: 'test-session' };
        const codeBlocks = [
            {
                path: 'package.json',
                content: JSON.stringify({
                    dependencies: {
                        vue: '^3.0.0',
                        react: '^18.0.0'
                    },
                    devDependencies: {
                        vitest: '^1.0.0'
                    }
                })
            }
        ];

        const request = {
            promiseId,
            context,
            codeBlocks,
            message: 'Hello'
        };

        // We need to call a function that triggers framework detection
        // executePendingRow is the one we modified
        await (processorService as any).executePendingRow(request);

        // Check if updateStatus was called with the modified context in the result
        expect(requestService.updateStatus).toHaveBeenCalledWith(
            promiseId,
            'completed',
            expect.objectContaining({
                context: expect.objectContaining({
                    frameworks: {
                        frontend: ['vue@3.0.0', 'react@18.0.0'],
                        backend: [],
                        testing: ['vitest@1.0.0']
                    }
                })
            })
        );
    });

    it('should handle missing package.json gracefully', async () => {
        const promiseId = 'test-promise-id-no-pkg';
        const context = { session_id: 'test-session' };
        const codeBlocks = [
            {
                path: 'README.md',
                content: '# My Project'
            }
        ];

        const request = {
            promiseId,
            context,
            codeBlocks,
            message: 'Hello'
        };

        await (processorService as any).executePendingRow(request);

        // Result context should NOT have frameworks if none detected
        const calls = (requestService.updateStatus as any).mock.calls;
        const lastCallResult = calls[0][2];
        
        expect(lastCallResult.context.frameworks).toBeUndefined();
    });
});
