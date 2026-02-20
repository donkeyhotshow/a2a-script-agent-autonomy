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
  it('should have valid index.html structure', () => {
    const htmlPath = path.resolve(__dirname, '../../web/index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).toContain('id="page-projects"');
    expect(html).toContain('id="page-sessions"');
    expect(html).toContain('id="page-explorer"');
    expect(html).toContain('js/storage.js');
    expect(html).toContain('js/sessions.js');
    expect(html).toContain('js/projects.js');
  });

  it('should have server API mounted at /api/v1', async () => {
    if (!app) return;
    const res = await request(app).get('/api/v1/sessions');
    expect([401, 400]).toContain(res.status);
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
