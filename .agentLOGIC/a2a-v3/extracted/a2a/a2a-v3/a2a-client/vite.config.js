import vitePluginA2a from './vite-plugin-a2a.js';

const devPort = Number(process.env.WEB_PORT) || 5173;
const clientApiPort = Number(process.env.CLIENT_API_PORT) || 3001;
const clientApiTarget = (process.env.CLIENT_API_URL || `http://localhost:${clientApiPort}`).replace(/\/$/, '');
// Keep `/api/a2a/*` on this Vite process (vite-plugin-a2a),
// and proxy every other `/api/*` endpoint to external Client API.
const nonA2aApiProxyContext = '^/api/(?!a2a/)';

/** @type {import('vite').UserConfig} */
export default {
    root: 'web',
    server: {
        port: devPort,
        proxy: {
            [nonA2aApiProxyContext]: {
                target: clientApiTarget,
                changeOrigin: true,
                ws: true,
            },
        },
    },
    plugins: [vitePluginA2a()],
    define: {
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    },
    resolve: {
        alias: {
            '@shared': './shared'
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
