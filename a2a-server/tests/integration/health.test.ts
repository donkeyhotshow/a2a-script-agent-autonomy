import request from 'supertest';
import app from '../../src/app.js';

describe('Health API', () => {
  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
      expect(res.body.version).toBeDefined();
    });

    it('should not require auth', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return component statuses', async () => {
      const res = await request(app).get('/health/detailed');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.components).toBeDefined();
      expect(res.body.components.database).toBeDefined();
      expect(res.body.components.redis).toBeDefined();
    });
  });
});
