import request from 'supertest';
import app from '../../src/app.js';
import { registerTestUser } from './helpers.js';

const validGitUrl = 'https://github.com/laravel/laravel.git';

describe('Projects API', () => {
  describe('GET /api/v1/projects', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/v1/projects');
      expect(res.status).toBe(401);
    });

    it('should return projects list for authenticated client', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.projects).toBeDefined();
      expect(Array.isArray(res.body.data.projects)).toBe(true);
      expect(res.body.data.total).toBeDefined();
      expect(res.body.data.page).toBeDefined();
      expect(res.body.data.limit).toBeDefined();
    });

    it('should support pagination', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .get('/api/v1/projects')
        .query({ page: 2, limit: 10 })
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.limit).toBe(10);
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should create project with valid data', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test Project ${Date.now()}`,
          gitUrl: validGitUrl,
          branch: 'main',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.gitUrl).toBe(validGitUrl);
    });

    it('should reject without name', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ gitUrl: validGitUrl });
      expect(res.status).toBe(400);
    });

    it('should reject without gitUrl', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test' });
      expect(res.status).toBe(400);
    });

    it('should reject invalid git URL', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Test',
          gitUrl: 'https://example.com/not-a-git-repo',
        });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/projects/:id', () => {
    it('should return project by id', async () => {
      const { accessToken } = await registerTestUser(app);
      const create = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Get Test ${Date.now()}`,
          gitUrl: validGitUrl,
        });
      const id = create.body.data.id;
      const res = await request(app)
        .get(`/api/v1/projects/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(id);
    });

    it('should return 404 for unknown id', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .get('/api/v1/projects/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/projects/:id', () => {
    it('should delete project', async () => {
      const { accessToken } = await registerTestUser(app);
      const create = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Delete Test ${Date.now()}`,
          gitUrl: validGitUrl,
        });
      const id = create.body.data.id;
      const del = await request(app)
        .delete(`/api/v1/projects/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(del.status).toBe(200);
      const get = await request(app)
        .get(`/api/v1/projects/${id}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(get.status).toBe(404);
    });
  });
});
