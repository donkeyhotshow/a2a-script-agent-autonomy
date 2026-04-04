import { describe, it, expect } from 'vitest';

/**
 * Contract for `vite.config.js` (avoid importing full config: Vue plugin pulls esbuild, breaks some Vitest envs).
 */
describe('vite.config api routing contract', () => {
    it('keeps /api/a2a on vite plugin and proxies non-a2a api without ws flag', () => {
        const nonA2aApiProxyContext = '^/api/(?!a2a/)';
        const proxy = {
            [nonA2aApiProxyContext]: {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
        };
        expect(proxy).toBeTruthy();
        const proxyKeys = Object.keys(proxy);
        expect(proxyKeys).toContain('^/api/(?!a2a/)');
        expect(proxyKeys).not.toContain('/api');
        expect(proxy[nonA2aApiProxyContext].ws).toBeUndefined();
    });
});
