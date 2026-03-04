{
  "step": "edit_tests",
  "message": "Adding health route test.",
  "execute": {
    "write-file": {
      "path": "tests/api.test.js",
      "content": "const request = require('supertest'); const app = require('../src/app'); describe('API routes', () => { it('GET /api/users', async () => { const r = await request(app).get('/api/users'); expect(r.status).toBe(200); }); it('GET /health returns ok', async () => { const r = await request(app).get('/health'); expect(r.status).toBe(200); expect( r.body.status).toBe('ok'); }); });"
    }
  },
  "completed": false
}
