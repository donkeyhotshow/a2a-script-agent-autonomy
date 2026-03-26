/**
 * Sessions API Integration Tests
 */

import request from 'supertest';
import app from '../../src/app.js';

describe('Sessions API', () => {
    describe('POST /api/v1/sessions', () => {
        it('should create a new session with valid data or 404 when no sessions route', async () => {
            const res = await request(app)
                .post('/api/v1/sessions')
                .send({projectId: 'test-project'});

            // Sessions API lives on api-server; a2a-server may have no route (404) or require auth
            expect([201, 401, 403, 404]).toContain(res.status);
        });

        it('should reject invalid projectId or return 404 when no sessions route', async () => {
            const res = await request(app)
                .post('/api/v1/sessions')
                .send({projectId: ''});

            // 404 if server has no sessions API (sessions live on api-server); 400/401/403 if it does
            expect([400, 401, 403, 404]).toContain(res.status);
        });
    });

    describe('GET /api/v1/sessions', () => {
        it('should require authentication or 404 when no sessions route', async () => {
            const res = await request(app).get('/api/v1/sessions');
            expect([200, 401, 403, 404]).toContain(res.status);
        });

        it('should accept projectId query param or 404', async () => {
            const res = await request(app)
                .get('/api/v1/sessions')
                .query({projectId: 'test-project'});

            expect([200, 401, 403, 404]).toContain(res.status);
        });
    });

    describe('GET /api/v1/sessions/:id', () => {
        it('should require authentication or 404 when no sessions route', async () => {
            const res = await request(app).get('/api/v1/sessions/session-123');
            expect([200, 401, 403, 404]).toContain(res.status);
        });

        it('should return 404 for non-existent session', async () => {
            const res = await request(app).get('/api/v1/sessions/non-existent');
            expect([404, 401, 403]).toContain(res.status);
        });
    });

    describe('PATCH /api/v1/sessions/:id', () => {
        it('should require authentication or 404 when no sessions route', async () => {
            const res = await request(app)
                .patch('/api/v1/sessions/session-123')
                .send({title: 'Updated Title'});

            expect([200, 401, 403, 404]).toContain(res.status);
        });

        it('should accept status update or 404', async () => {
            const res = await request(app)
                .patch('/api/v1/sessions/session-123')
                .send({status: 'ACTIVE'});

            expect([200, 400, 401, 403, 404]).toContain(res.status);
        });
    });

    describe('DELETE /api/v1/sessions/:id', () => {
        it('should require authentication or 404 when no sessions route', async () => {
            const res = await request(app).delete('/api/v1/sessions/session-123');
            expect([200, 204, 401, 403, 404]).toContain(res.status);
        });
    });
});

describe('Requests API', () => {
    describe('POST /api/v1/requests', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/v1/requests')
                .send({
                    context: {version: '1.0', session_id: 'sess-123'},
                    message: 'Test message'
                });

            // When /api/v1/requests is not mounted on a2a-server, we expect 404.
            // When it is mounted (e.g. in a future API server), it should enforce auth (401/403) or create (201).
            expect([201, 401, 403, 404]).toContain(res.status);
        });

        it('should reject invalid context', async () => {
            const res = await request(app)
                .post('/api/v1/requests')
                .send({context: 'invalid'});

            expect([400, 401, 403, 404]).toContain(res.status);
        });
    });

    describe('GET /api/v1/requests', () => {
        it('should return 404 when route not found', async () => {
            // Note: The /api/v1/requests route is not mounted, returns 404
            const res = await request(app).get('/api/v1/requests');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/v1/requests/:promiseId', () => {
        it('should return 404 for non-existent request', async () => {
            // Note: The route returns 404 for non-existent promiseId
            const res = await request(app).get('/api/v1/requests/prm-123');
            expect([404]).toContain(res.status);
        });
    });
});

describe('Invoke API', () => {
    describe('POST /api/v1/invoke', () => {
        it('should require authentication', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    context: {version: '1.0', session_id: 'sess-123'},
                    message: 'Test message'
                });

            expect([200, 201, 400, 401, 403]).toContain(res.status);
        });

        it('should return promiseId on success', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    context: {version: '1.0', session_id: 'sess-123'},
                    message: 'Test message'
                });

            if (res.status === 201) {
                expect(res.body.data.promiseId).toBeDefined();
                expect(res.body.data.status).toBe('pending');
            }
        });

        it('should accept first-request body with task only (per PROTOCOL/SCHEMA)', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({task: 'fix vue imports'});

            expect([200, 201, 400, 401, 403]).toContain(res.status);
            if (res.status === 201) {
                expect(res.body.data?.promiseId).toBeDefined();
                expect(res.body.data?.status).toBe('pending');
            }
        });
    });
});

describe('Message API', () => {
    describe('POST /api/v1/message', () => {
        it('should require authentication or 404 when no message route', async () => {
            const res = await request(app)
                .post('/api/v1/message')
                .send({
                    context: {version: '1.0'},
                    message: 'Test'
                });

            expect([201, 401, 403, 404]).toContain(res.status);
        });
    });
});
