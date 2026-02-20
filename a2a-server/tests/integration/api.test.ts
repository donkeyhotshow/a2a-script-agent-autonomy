import request from 'supertest';
import app from '../../src/app.js';
import { registerTestUser } from './helpers.js';

const validGitUrl = 'https://github.com/laravel/laravel.git';

/**
 * Full-flow integration: register -> token -> projects -> session -> message -> delete
 */
describe('API full flow', () => {
  it('should complete full user journey', async () => {
    const { accessToken } = await registerTestUser(app);

    const projectsRes = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(projectsRes.status).toBe(200);

    const createProject = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: `Flow Test ${Date.now()}`,
        gitUrl: validGitUrl,
      });
    expect(createProject.status).toBe(201);
    const projectId = createProject.body.data.id;

    const createSession = await request(app)
      .post('/api/v1/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ project_id: projectId });
    expect(createSession.status).toBe(201);
    const sessionId = createSession.body.data.session_id;

    const messageRes = await request(app)
      .post(`/api/v1/sessions/${sessionId}/message`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ context: { new_task: ['List main files'] } });
    expect(messageRes.status).toBe(200);

    const contextRes = await request(app)
      .get(`/api/v1/sessions/${sessionId}/context`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(contextRes.status).toBe(200);

    const deleteSession = await request(app)
      .delete(`/api/v1/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteSession.status).toBe(204);

    const deleteProject = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${accessToken}`);
    expect(deleteProject.status).toBe(200);
  });
});
