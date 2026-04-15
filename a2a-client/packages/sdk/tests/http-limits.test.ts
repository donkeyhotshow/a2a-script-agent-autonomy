import { afterEach, describe, expect, it } from 'vitest';
import {
    createStandaloneRateLimitMiddleware,
    getStandaloneHttpLimitsProfile,
} from '../src/server/server/http-limits.ts';

const ENV_KEYS = [
    'SDK_HTTP_CORS_ENABLED',
    'SDK_HTTP_CORS_ORIGIN',
    'SDK_HTTP_CORS_METHODS',
    'SDK_HTTP_RATE_LIMIT_ENABLED',
    'SDK_HTTP_RATE_LIMIT_WINDOW_MS',
    'SDK_HTTP_RATE_LIMIT_MAX',
    'SDK_HTTP_FILE_CAP_BYTES',
] as const;

const resetHttpLimitEnv = () => {
    for (const key of ENV_KEYS) {
        delete process.env[key];
    }
};

afterEach(() => {
    resetHttpLimitEnv();
});

describe('standalone SDK HTTP limits profile', () => {
    it('returns sensible defaults', () => {
        const profile = getStandaloneHttpLimitsProfile();

        expect(profile.cors.enabled).toBe(true);
        expect(profile.cors.origin).toBe('*');
        expect(profile.rateLimit.enabled).toBe(true);
        expect(profile.rateLimit.windowMs).toBe(60_000);
        expect(profile.rateLimit.maxRequests).toBe(120);
        expect(profile.fileCap.maxBodyBytes).toBe(5 * 1024 * 1024);
    });

    it('applies environment overrides', () => {
        process.env.SDK_HTTP_CORS_ENABLED = 'false';
        process.env.SDK_HTTP_CORS_ORIGIN = 'https://a.example, https://b.example';
        process.env.SDK_HTTP_CORS_METHODS = 'GET,POST';
        process.env.SDK_HTTP_RATE_LIMIT_ENABLED = 'true';
        process.env.SDK_HTTP_RATE_LIMIT_WINDOW_MS = '30000';
        process.env.SDK_HTTP_RATE_LIMIT_MAX = '2';
        process.env.SDK_HTTP_FILE_CAP_BYTES = '2048';

        const profile = getStandaloneHttpLimitsProfile();

        expect(profile.cors.enabled).toBe(false);
        expect(profile.cors.origin).toEqual(['https://a.example', 'https://b.example']);
        expect(profile.cors.methods).toEqual(['GET', 'POST']);
        expect(profile.rateLimit.enabled).toBe(true);
        expect(profile.rateLimit.windowMs).toBe(30_000);
        expect(profile.rateLimit.maxRequests).toBe(2);
        expect(profile.fileCap.maxBodyBytes).toBe(2048);
    });
});

describe('standalone SDK rate limit middleware', () => {
    it('returns 429 after max requests in the same window', () => {
        const middleware = createStandaloneRateLimitMiddleware({
            cors: { enabled: true, origin: '*', methods: ['GET'] },
            rateLimit: { enabled: true, windowMs: 60_000, maxRequests: 2 },
            fileCap: { maxBodyBytes: 1024 },
        });

        const makeReq = () => ({
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
        });

        const calls: number[] = [];
        const makeRes = () => ({
            status(code: number) {
                calls.push(code);
                return this;
            },
            json(_payload: unknown) {
                return this;
            },
        });

        let nextCalls = 0;
        const next = () => {
            nextCalls += 1;
        };

        middleware(makeReq() as never, makeRes() as never, next);
        middleware(makeReq() as never, makeRes() as never, next);
        middleware(makeReq() as never, makeRes() as never, next);

        expect(nextCalls).toBe(2);
        expect(calls).toEqual([429]);
    });
});
