import fs from 'fs';
import path from 'path';
import { getStorageRoot } from './vite-plugin-a2a/storage/root.js';
import { createProjectRoutes } from './vite-plugin-a2a/routes/projects.js';
import { createSessionRoutes } from './vite-plugin-a2a/routes/sessionRoutes.js';
import { createStepRoutes } from './vite-plugin-a2a/routes/stepRoutes.js';
import { createKvRoutes } from './vite-plugin-a2a/routes/kvRoutes.js';
import { createDaemonRoutes } from './vite-plugin-a2a/routes/daemonRoutes.js';
import { createActionsRoutes } from './vite-plugin-a2a/routes/actions.js';

/**
 * Dev Client API for `/api/a2a/*`. Separate from `packages/sdk` Express — keep behavior in sync or share code; see docs/CLIENT_API_WEB_SDK.md
 */
export default function vitePluginA2a() {
    let basePath = process.cwd();

    // If not in a2a-client, check parent
    if (!fs.existsSync(path.join(basePath, 'a2a-client')) && !fs.existsSync(path.join(basePath, 'web'))) {
        const parentPath = path.join(basePath, '..');
        if (fs.existsSync(path.join(parentPath, 'a2a-client')) || fs.existsSync(path.join(parentPath, 'web'))) {
            basePath = parentPath;
        }
    }

    // Use basePath directly (a2a-client is the project root, not a subfolder)
    const cwd = basePath;

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
            server.middlewares.use(createActionsRoutes({ cwd }));
            
            // Serve shared files - check parent first (repo root), then local a2a-client/shared
            let sharedPath = path.join(cwd, '..', 'shared');
            if (!fs.existsSync(sharedPath)) {
                sharedPath = path.join(cwd, 'shared');
            }
            if (fs.existsSync(sharedPath)) {
                server.middlewares.use('/shared', (req, res, next) => {
                    const subPath = req.url.split('?')[0].replace(/^\//, '');
                    const filePath = path.join(sharedPath, subPath);
                    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
                        const ext = path.extname(filePath);
                        const contentTypes = {
                            '.js': 'application/javascript',
                            '.mjs': 'application/javascript',
                            '.json': 'application/json',
                            '.d.ts': 'application/typescript',
                        };
                        res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
                        res.end(fs.readFileSync(filePath));
                    } else {
                        next();
                    }
                });
            }
        }
    };
}
