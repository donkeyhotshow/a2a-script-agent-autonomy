import request from 'supertest';
import app from '../../src/app.js';
import { registerTestUser } from './helpers.js';

describe('Auth API', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register a new client', async () => {
      const email = `new-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New User',
          email,
          password: 'Password123',
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe(email);
      expect(res.body.data.apiKey).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'not-an-email',
          password: 'Password123',
        });
      expect(res.status).toBe(400);
    });

    it('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test',
          email: 'weak@example.com',
          password: 'short',
        });
      expect(res.status).toBe(400);
    });

    it('should reject duplicate email', async () => {
      const { email } = await registerTestUser(app);
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate',
          email,
          password: 'Password123',
        });
      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/token', () => {
    it('should return tokens for valid credentials', async () => {
      const { email } = await registerTestUser(app);
      const res = await request(app)
        .post('/api/v1/auth/token')
        .send({ email, password: 'Password123' });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/token')
        .send({ email: 'nonexistent@example.com', password: 'wrong' });
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh tokens', async () => {
      const { email } = await registerTestUser(app);
      const tokenRes = await request(app)
        .post('/api/v1/auth/token')
        .send({ email, password: 'Password123' });
      const refreshToken = tokenRes.body.data.refreshToken;
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current client with valid token', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBeDefined();
    });
  });
});
