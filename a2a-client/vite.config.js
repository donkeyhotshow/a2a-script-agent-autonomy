import vitePluginA2a from './vite-plugin-a2a.js';

/** @type {import('vite').UserConfig} */
export default {
    root: 'web',
    server: {
        port: 5173,
        proxy: {
            '/api': {
                // a2a-server (main server)
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/client-api': {
                // a2a-client API (local functions: terminal, fs-utils, etc.)
                target: 'http://localhost:3000',
                changeOrigin: true,
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
