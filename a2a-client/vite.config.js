import vitePluginA2a from './vite-plugin-a2a.js';

const devPort = Number(process.env.PORT) || 5173;
const clientApiPort = Number(process.env.CLIENT_API_PORT) || 3001;
const clientApiTarget = (process.env.CLIENT_API_URL || `http://localhost:${clientApiPort}`).replace(/\/$/, '');
const apiProxyContext = '^(?!/api/a2a)/api';

/** @type {import('vite').UserConfig} */
export default {
    root: 'web',
    server: {
        port: devPort,
        proxy: {
            [apiProxyContext]: {
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
