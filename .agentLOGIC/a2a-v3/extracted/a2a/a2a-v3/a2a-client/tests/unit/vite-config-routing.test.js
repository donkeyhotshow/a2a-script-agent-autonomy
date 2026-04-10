import { describe, it, expect } from 'vitest';

import viteConfig from '../../vite.config.js';

describe('vite.config api routing', () => {
    it('keeps /api/a2a on vite plugin and proxies non-a2a api', () => {
        const proxy = viteConfig?.server?.proxy;
        expect(proxy).toBeTruthy();

        const proxyKeys = Object.keys(proxy);
        expect(proxyKeys).toContain('^/api/(?!a2a/)');
        expect(proxyKeys).not.toContain('/api');
    });
});
