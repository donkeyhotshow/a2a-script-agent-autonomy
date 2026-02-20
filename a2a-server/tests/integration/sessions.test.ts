import request from 'supertest';
import app from '../../src/app.js';
import { registerTestUser } from './helpers.js';

const validGitUrl = 'https://github.com/laravel/laravel.git';

async function createProject(token: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: `Session Test ${Date.now()}`, gitUrl: validGitUrl });
  if (res.status !== 201) throw new Error(`createProject failed: ${res.status}`);
  return res.body.data.id;
}

describe('Sessions API', () => {
  describe('POST /api/v1/sessions', () => {
    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/sessions')
        .send({ project_id: '00000000-0000-0000-0000-000000000000' });
      expect(res.status).toBe(401);
    });

    it('should create session for project', async () => {
      const { accessToken } = await registerTestUser(app);
      const projectId = await createProject(accessToken);
      const res = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ project_id: projectId });
      expect(res.status).toBe(201);
      expect(res.body.data.session_id).toBeDefined();
      expect(res.body.data.project_id).toBe(projectId);
      expect(res.body.data.status).toBeDefined();
    });

    it('should return 400 without project_id', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/sessions/:id', () => {
    it('should return session by id', async () => {
      const { accessToken } = await registerTestUser(app);
      const projectId = await createProject(accessToken);
      const create = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ project_id: projectId });
      const sessionId = create.body.data.session_id;
      const res = await request(app)
        .get(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.data.session_id).toBe(sessionId);
      expect(res.body.data.tasks).toBeDefined();
    });

    it('should return 404 for unknown id', async () => {
      const { accessToken } = await registerTestUser(app);
      const res = await request(app)
        .get('/api/v1/sessions/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/sessions/:id/message', () => {
    it('should accept message with new_task', async () => {
      const { accessToken } = await registerTestUser(app);
      const projectId = await createProject(accessToken);
      const create = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ project_id: projectId });
      const sessionId = create.body.data.session_id;
      const res = await request(app)
        .post(`/api/v1/sessions/${sessionId}/message`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          context: { new_task: ['Analyze the project structure'] },
        });
      expect(res.status).toBe(200);
      expect(res.body.data.tasks).toBeDefined();
    });

    it('should reject without new_task', async () => {
      const { accessToken } = await registerTestUser(app);
      const projectId = await createProject(accessToken);
      const create = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ project_id: projectId });
      const sessionId = create.body.data.session_id;
      const res = await request(app)
        .post(`/api/v1/sessions/${sessionId}/message`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/sessions/:id/continue', () => {
    it('should accept continue request', async () => {
      const { accessToken } = await registerTestUser(app);
      const projectId = await createProject(accessToken);
      const create = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ project_id: projectId });
      const sessionId = create.body.data.session_id;
      const res = await request(app)
        .post(`/api/v1/sessions/${sessionId}/continue`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.data.session_id).toBe(sessionId);
    });
  });

  describe('DELETE /api/v1/sessions/:id', () => {
    it('should delete session', async () => {
      const { accessToken } = await registerTestUser(app);
      const projectId = await createProject(accessToken);
      const create = await request(app)
        .post('/api/v1/sessions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ project_id: projectId });
      const sessionId = create.body.data.session_id;
      const del = await request(app)
        .delete(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect([200, 204]).toContain(del.status);
      const get = await request(app)
        .get(`/api/v1/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${accessToken}`);
      expect(get.status).toBe(404);
    });
  });
});
