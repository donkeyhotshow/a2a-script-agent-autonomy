import fs from 'fs';
import path from 'path';
import { getStorageRoot } from '@a2a-client/storage/src/root.ts';
import { createProjectRoutes } from './routes/projects.js';
import { createSessionRoutes } from './routes/sessionRoutes.js';
import { createStepRoutes } from './routes/stepRoutes.js';
import { createKvRoutes } from './routes/kvRoutes.js';
import { createDaemonRoutes } from './routes/daemonRoutes.js';
import { createActionsRoutes } from './routes/actions.js';
import { createModelsRoutes } from './routes/modelsRoutes.js';
import { createHubPromiseRoutes } from './routes/hubPromiseRoutes.js';

/**
 * Dev Client API for `/api/a2a/*`. Separate from `packages/sdk` Express — keep behavior in sync or share code; see docs/CLIENT_API_WEB_SDK.md
 */
export default function vitePluginA2a() {
    let basePath = process.cwd();

    // If not in a2a-client, check parent
    if (!fs.existsSync(path.join(basePath, 'a2a-client')) && !fs.existsSync(path.join(basePath, 'packages', 'web'))) {
        const parentPath = path.join(basePath, '..');
        if (fs.existsSync(path.join(parentPath, 'a2a-client')) || fs.existsSync(path.join(parentPath, 'packages', 'web'))) {
            basePath = parentPath;
        }
    }

    const cwd = basePath;

    let sharedPath = path.join(cwd, '..', 'shared');
    if (!fs.existsSync(sharedPath)) {
        sharedPath = path.join(cwd, 'shared');
    }

    const storageRoot = getStorageRoot();
    console.log('[vite-plugin-a2a] Project path:', cwd, '| Storage:', storageRoot);

    return {
        name: 'vite-plugin-a2a',
        enforce: 'pre',
        /** HTML uses absolute /shared/*.ts — map to repo `shared/` so Vite pre-transform resolves (middleware alone is too late). */
        resolveId(id) {
            if (!id.startsWith('/shared/')) return null;
            const fsPath = path.join(sharedPath, id.slice('/shared/'.length));
            if (fs.existsSync(fsPath) && fs.statSync(fsPath).isFile()) {
                return fsPath;
            }
            return null;
        },
        configureServer(server) {
            console.error('[VitePlugin-A2A] Starting initialization...');

            if (fs.existsSync(sharedPath)) {
                server.middlewares.use('/shared', (req, res, next) => {
                    const subPath = req.url.split('?')[0].replace(/^\//, '');
                    const filePath = path.join(sharedPath, subPath);
                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        const ext = path.extname(filePath);
                        const contentTypes = {
                            '.ts': 'application/javascript',
                            '.mjs': 'application/javascript',
                            '.tson': 'application/json',
                            '.d.ts': 'application/typescript',
                        };
                        res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
                        res.end(fs.readFileSync(filePath));
                    } else {
                        next();
                    }
                });
            }

            server.middlewares.use((req, res, next) => {
                console.error('[VitePlugin-A2A] REQUEST:', req.method, req.url);
                next();
            });

            // Hub proxy before other /api/a2a/* handlers so promise-queue probes always hit pass-through.
            server.middlewares.use(createHubPromiseRoutes());
            server.middlewares.use(createProjectRoutes({ cwd }));
            server.middlewares.use(createModelsRoutes());
            server.middlewares.use(createSessionRoutes({ cwd }));
            server.middlewares.use(createStepRoutes({ cwd }));
            server.middlewares.use(createKvRoutes({ cwd }));
            server.middlewares.use(createDaemonRoutes({ cwd }));
            server.middlewares.use(createActionsRoutes({ cwd }));
        }
    };
}
