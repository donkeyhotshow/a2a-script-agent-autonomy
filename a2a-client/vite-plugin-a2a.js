import fs from 'fs';
import path from 'path';
import { getStorageRoot } from './vite-plugin-a2a/storage/root.js';
import { createProjectRoutes } from './vite-plugin-a2a/routes/projects.js';
import { createSessionRoutes } from './vite-plugin-a2a/routes/sessionRoutes.js';
import { createStepRoutes } from './vite-plugin-a2a/routes/stepRoutes.js';
import { createKvRoutes } from './vite-plugin-a2a/routes/kvRoutes.js';
import { createDaemonRoutes } from './vite-plugin-a2a/routes/daemonRoutes.js';

/**
 * Dev Client API for `/api/a2a/*`. Separate from `packages/sdk` Express — keep behavior in sync or share code; see docs/CLIENT_API_WEB_SDK.md
 */
export default function vitePluginA2a() {
    let basePath = process.cwd();

    if (!fs.existsSync(path.join(basePath, 'a2a-client'))) {
        if (!fs.existsSync(path.join(basePath, 'web')) && !fs.existsSync(path.join(basePath, 'packages'))) {
            const parentPath = path.join(basePath, '..');
            if (fs.existsSync(path.join(parentPath, 'a2a-client'))) {
                basePath = parentPath;
            }
        }
    }

    const cwd = fs.existsSync(path.join(basePath, 'a2a-client'))
        ? path.join(basePath, 'a2a-client')
        : basePath;

    const storageRoot = getStorageRoot();
    console.log('[vite-plugin-a2a] Project path:', cwd, '| Storage:', storageRoot);

    return {
        name: 'vite-plugin-a2a',
        configureServer(server) {
            console.error('[VitePlugin-A2A] Starting initialization...');

            server.middlewares.use((req, res, next) => {
                console.error('[VitePlugin-A2A] REQUEST:', req.method, req.url);
                next();
            });

            server.middlewares.use(createProjectRoutes({ cwd }));
            server.middlewares.use(createSessionRoutes({ cwd }));
            server.middlewares.use(createStepRoutes({ cwd }));
            server.middlewares.use(createKvRoutes({ cwd }));
            server.middlewares.use(createDaemonRoutes({ cwd }));
        }
    };
}
