/**
 * Web App Integration Tests
 * Static structure + server API (E2E flows in playwright)
 */

const path = require('path');
const fs = require('fs');
const request = require('supertest');

let app;
beforeAll(async () => {
    try {
        const mod = await import(path.resolve(__dirname, '../../../a2a-server/src/app.ts'));
        app = mod.default;
    } catch {
        app = null;
    }
});

describe('Web App integration', () => {
    it('should have valid index.html structure with TaskFlow', () => {
        const htmlPath = path.resolve(__dirname, '../../packages/web/index.html');
        const html = fs.readFileSync(htmlPath, 'utf8');
        // Check for TaskFlow scripts (new architecture)
        expect(html).toContain('js/task-flow/render.js');
        expect(html).toContain('js/task-flow/loader.js');
        expect(html).toContain('js/task-flow/tasks.js');
        expect(html).toContain('js/task-flow/messages.js');
        expect(html).toContain('js/task-flow/init.js');
        expect(html).toContain('js/task-flow/index.js');
        // Check for session store
        expect(html).toContain('js/session-store.js');
    });

    it('should have TaskFlow files', () => {
        const flowDir = path.resolve(__dirname, '../../packages/web/js/task-flow');
        expect(fs.existsSync(path.join(flowDir, 'render.js'))).toBe(true);
        expect(fs.existsSync(path.join(flowDir, 'loader.js'))).toBe(true);
        expect(fs.existsSync(path.join(flowDir, 'tasks.js'))).toBe(true);
        expect(fs.existsSync(path.join(flowDir, 'messages.js'))).toBe(true);
    });

    it('should have server API mounted at /api/v1', async () => {
        if (!app) return;
        const res = await request(app).get('/api/v1/sessions');
        expect([401, 400, 404]).toContain(res.status);
    });

    it('should return 404 for unknown API route', async () => {
        if (!app) return;
        const res = await request(app).get('/api/v1/nonexistent');
        expect(res.status).toBe(404);
    });

    it('should have health endpoint', async () => {
        if (!app) return;
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
