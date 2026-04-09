import { getStorageMode } from './middleware/validators.ts';
import { handleNextStep } from './step-routes-dialog-flow.ts';
import { handleAsyncFlow } from './step-routes-async-flow.ts';
import { handleRouterFlow } from './step-routes-router-flow.ts';

const API_PREFIX = '/api/a2a';

export function createStepRoutes({ cwd }) {
    return async (req, res, next) => {
        if (!req.url?.startsWith(`${API_PREFIX}/sessions`)) {
            return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const p = url.pathname.slice(API_PREFIX.length);
        const storageMode = getStorageMode(req);

        if (storageMode !== 'storage' && storageMode !== 'project') {
            return next();
        }

        if (await handleRouterFlow({ cwd, path: p, req, res, url, storageMode })) {
            return;
        }

        if (handleNextStep({ cwd, path: p, req, res, storageMode })) {
            return;
        }

        if (await handleAsyncFlow({ cwd, url, path: p, req, res, storageMode })) {
            return;
        }

        next();
    };
}
