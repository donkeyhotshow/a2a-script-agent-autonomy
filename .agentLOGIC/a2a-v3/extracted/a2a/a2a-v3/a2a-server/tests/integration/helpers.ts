import request from 'supertest';
import type {Express} from 'express';

export async function getTestToken(app: Express): Promise<string> {
    const res = await request(app)
        .post('/api/v1/auth/token')
        .send({email: 'test@example.com', password: 'password123'});
    if (res.status !== 200) {
        throw new Error(`getTestToken failed: ${res.status} ${JSON.stringify(res.body)}`);
    }
    return res.body.data.accessToken;
}

export async function registerTestUser(
    app: Express,
    overrides?: { email?: string; password?: string; name?: string }
): Promise<{ accessToken: string; email: string }> {
    const email = overrides?.email ?? `test-${Date.now()}@example.com`;
    const password = overrides?.password ?? 'Password123';
    const name = overrides?.name ?? 'Test User';
    const reg = await request(app)
        .post('/api/v1/auth/register')
        .send({name, email, password});
    if (reg.status !== 201) {
        throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.body)}`);
    }
    const tokenRes = await request(app)
        .post('/api/v1/auth/token')
        .send({email, password});
    if (tokenRes.status !== 200) {
        throw new Error(`token failed: ${tokenRes.status}`);
    }
    return {accessToken: tokenRes.body.data.accessToken, email};
}
