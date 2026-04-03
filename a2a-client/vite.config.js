import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import vitePluginA2a from '@a2a-client/vite-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const devPort = Number(process.env.WEB_PORT) || 5173;
const clientApiPort = Number(process.env.CLIENT_API_PORT) || 3001;
const clientApiTarget = (process.env.CLIENT_API_URL || `http://localhost:${clientApiPort}`).replace(/\/$/, '');
// Keep `/api/a2a/*` on this Vite process (@a2a-client/vite-plugin),
// and proxy every other `/api/*` endpoint to external Client API.
const nonA2aApiProxyContext = '^/api/(?!a2a/)';

/** @type {import('vite').UserConfig} */
export default {
    root: 'packages/web',
    server: {
        port: devPort,
        fs: {
            allow: [path.resolve(__dirname, '..')],
        },
        proxy: {
            [nonA2aApiProxyContext]: {
                target: clientApiTarget,
                changeOrigin: true,
            },
        },
    },
    plugins: [vue(), vitePluginA2a()],
    define: {
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'packages/web/src'),
            '@shared': path.resolve(__dirname, '../shared'),
        }
    },
    optimizeDeps: {
        exclude: ['vue', '@vue-flow/core', '@vue-flow/background', '@vue-flow/controls', '@vue-flow/minimap']
    },
    build: {
        rollupOptions: {
            external: ['vue', '@vue-flow/core', '@vue-flow/background', '@vue-flow/controls', '@vue-flow/minimap']
        }
    },
    esbuild: {
        target: 'es2020'
    }
};
