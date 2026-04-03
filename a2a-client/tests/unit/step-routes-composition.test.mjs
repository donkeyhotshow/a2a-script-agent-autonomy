import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
    mockedGetStorageMode,
    mockedHandleRouterFlow,
    mockedHandleNextStep,
    mockedHandleAsyncFlow,
} = vi.hoisted(() => ({
    mockedGetStorageMode: vi.fn(() => 'storage'),
    mockedHandleRouterFlow: vi.fn(() => false),
    mockedHandleNextStep: vi.fn(() => false),
    mockedHandleAsyncFlow: vi.fn(() => false),
}));

vi.mock('../../vite-plugin-a2a/routes/middleware/validators.js', () => ({
    getStorageMode: mockedGetStorageMode,
}));

vi.mock('../../vite-plugin-a2a/routes/step-routes-router-flow.js', () => ({
    handleRouterFlow: mockedHandleRouterFlow,
}));

vi.mock('../../vite-plugin-a2a/routes/step-routes-dialog-flow.js', () => ({
    handleNextStep: mockedHandleNextStep,
}));

vi.mock('../../vite-plugin-a2a/routes/step-routes-async-flow.js', () => ({
    handleAsyncFlow: mockedHandleAsyncFlow,
}));

import { createStepRoutes } from '../../vite-plugin-a2a/routes/stepRoutes.js';

function createReqRes(url, method = 'GET') {
    return {
        req: { url, method },
        res: { writeHead: vi.fn(() => ({ end: vi.fn() })), setHeader: vi.fn(), end: vi.fn() },
    };
}

describe('stepRoutes composition root', () => {
    beforeEach(() => {
        mockedGetStorageMode.mockReset();
        mockedGetStorageMode.mockReturnValue('storage');
        mockedHandleRouterFlow.mockReset();
        mockedHandleRouterFlow.mockReturnValue(false);
        mockedHandleNextStep.mockReset();
        mockedHandleNextStep.mockReturnValue(false);
        mockedHandleAsyncFlow.mockReset();
        mockedHandleAsyncFlow.mockReturnValue(false);
    });

    it('delegates to router flow first and short-circuits', async () => {
        mockedHandleRouterFlow.mockReturnValue(true);
        const middleware = createStepRoutes({ cwd: '/tmp/project' });
        const next = vi.fn();
        const { req, res } = createReqRes('/api/a2a/sessions/sess_1/latest');

        await middleware(req, res, next);

        expect(mockedHandleRouterFlow).toHaveBeenCalledTimes(1);
        expect(mockedHandleNextStep).not.toHaveBeenCalled();
        expect(mockedHandleAsyncFlow).not.toHaveBeenCalled();
        expect(next).not.toHaveBeenCalled();
    });

    it('falls through router -> dialog -> async chain', async () => {
        mockedHandleAsyncFlow.mockReturnValue(true);
        const middleware = createStepRoutes({ cwd: '/tmp/project' });
        const next = vi.fn();
        const { req, res } = createReqRes('/api/a2a/sessions/sess_1/async');

        await middleware(req, res, next);

        expect(mockedHandleRouterFlow).toHaveBeenCalledTimes(1);
        expect(mockedHandleNextStep).toHaveBeenCalledTimes(1);
        expect(mockedHandleAsyncFlow).toHaveBeenCalledTimes(1);
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next when storage mode is unknown (not storage or project)', () => {
        mockedGetStorageMode.mockReturnValue('memory');
        const middleware = createStepRoutes({ cwd: '/tmp/project' });
        const next = vi.fn();
        const { req, res } = createReqRes('/api/a2a/sessions/sess_1/latest');

        middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(mockedHandleRouterFlow).not.toHaveBeenCalled();
        expect(mockedHandleNextStep).not.toHaveBeenCalled();
        expect(mockedHandleAsyncFlow).not.toHaveBeenCalled();
    });

    it('runs handler chain when storage mode is project', () => {
        mockedGetStorageMode.mockReturnValue('project');
        mockedHandleRouterFlow.mockReturnValue(true);
        const middleware = createStepRoutes({ cwd: '/tmp/project' });
        const next = vi.fn();
        const { req, res } = createReqRes('/api/a2a/sessions/sess_1/latest');

        middleware(req, res, next);

        expect(mockedHandleRouterFlow).toHaveBeenCalledTimes(1);
        expect(next).not.toHaveBeenCalled();
    });
});
