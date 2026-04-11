import request from 'supertest';
import app from '../../src/app';

describe('Health API', () => {
    describe('GET /health', () => {
        it('should return ok status', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.mode).toBe('stateless');
            expect(res.body.timestamp).toBeDefined();
        });

        it('should not require auth', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });
});
