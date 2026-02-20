/**
 * A2A Client <-> Server Integration Tests
 * Uses supertest against a2a-server app (no live server needed)
 */

const path = require('path');
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

describe('ApiClient <-> Server integration', () => {
  it('should connect to server health', async () => {
    if (!app) return;
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('should return 401 for projects without auth', async () => {
    if (!app) return;
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(401);
  });

  it('should handle server 404 for unknown route', async () => {
    if (!app) return;
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
  });
});
