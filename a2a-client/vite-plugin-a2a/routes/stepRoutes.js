import { getStorageMode } from './middleware/validators.js';
import { handleNextStep } from './step-routes-dialog-flow.js';
import { handleAsyncFlow } from './step-routes-async-flow.js';
import { handleRouterFlow } from './step-routes-router-flow.js';

const API_PREFIX = '/api/a2a';

export function createStepRoutes({ cwd }) {
    return (req, res, next) => {
        if (!req.url?.startsWith(`${API_PREFIX}/sessions`)) {
            return next();
        }

        const url = new URL(req.url, 'http://localhost');
        const p = url.pathname.slice(API_PREFIX.length);
        const storageMode = getStorageMode(req);

        if (storageMode !== 'storage') {
            return next();
        }

        if (handleRouterFlow({ cwd, path: p, req, res, url })) {
            return;
        }

        if (handleNextStep({ cwd, path: p, req, res })) {
            return;
        }

        if (handleAsyncFlow({ cwd, url, path: p, req, res })) {
            return;
        }

        next();
    };
}
