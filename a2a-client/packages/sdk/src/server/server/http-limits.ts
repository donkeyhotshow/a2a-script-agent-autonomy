import cors, { type CorsOptions } from 'cors';
import type { NextFunction, Request, Response } from 'express';

const toBoolean = (env: string | undefined, fallback: boolean): boolean => {
    if (env === undefined) return fallback;
    const normalized = env.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const toNumber = (env: string | undefined, fallback: number): number => {
    if (!env) return fallback;
    const parsed = Number(env);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const toStringArray = (env: string | undefined, fallback: string[]): string[] => {
    if (!env) return fallback;
    return env.split(',').map((entry) => entry.trim()).filter(Boolean);
};

export interface StandaloneHttpLimitsProfile {
    cors: {
        enabled: boolean;
        origin: string | string[];
        methods: string[];
    };
    rateLimit: {
        enabled: boolean;
        windowMs: number;
        maxRequests: number;
    };
    fileCap: {
        maxBodyBytes: number;
    };
}

const DEFAULT_CORS_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export function getStandaloneHttpLimitsProfile(): StandaloneHttpLimitsProfile {
    const fileCapBytes = toNumber(process.env.SDK_HTTP_FILE_CAP_BYTES, 5 * 1024 * 1024);
    const originEnv = process.env.SDK_HTTP_CORS_ORIGIN;

    return {
        cors: {
            enabled: toBoolean(process.env.SDK_HTTP_CORS_ENABLED, true),
            origin: originEnv ? toStringArray(originEnv, ['*']) : '*',
            methods: toStringArray(process.env.SDK_HTTP_CORS_METHODS, DEFAULT_CORS_METHODS),
        },
        rateLimit: {
            enabled: toBoolean(process.env.SDK_HTTP_RATE_LIMIT_ENABLED, true),
            windowMs: toNumber(process.env.SDK_HTTP_RATE_LIMIT_WINDOW_MS, 60 * 1000),
            maxRequests: toNumber(process.env.SDK_HTTP_RATE_LIMIT_MAX, 120),
        },
        fileCap: {
            maxBodyBytes: Math.max(1024, fileCapBytes),
        },
    };
}

export function buildStandaloneCorsOptions(profile: StandaloneHttpLimitsProfile): CorsOptions {
    const origin = profile.cors.origin;
    if (origin === '*') {
        return {
            origin: true,
            methods: profile.cors.methods,
        };
    }

    const allowSet = new Set(origin);
    return {
        origin: (requestOrigin, callback) => {
            if (!requestOrigin || allowSet.has(requestOrigin)) {
                callback(null, true);
                return;
            }
            callback(new Error('CORS origin not allowed'));
        },
        methods: profile.cors.methods,
    };
}

export function createStandaloneRateLimitMiddleware(profile: StandaloneHttpLimitsProfile) {
    const requestBuckets = new Map<string, { count: number; startedAt: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
        if (!profile.rateLimit.enabled) {
            next();
            return;
        }

        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const current = requestBuckets.get(key);

        if (!current || now - current.startedAt >= profile.rateLimit.windowMs) {
            requestBuckets.set(key, { count: 1, startedAt: now });
            next();
            return;
        }

        if (current.count >= profile.rateLimit.maxRequests) {
            res.status(429).json({
                error: 'Too many requests',
                code: 'RATE_LIMITED',
                retryAfterMs: Math.max(0, profile.rateLimit.windowMs - (now - current.startedAt)),
            });
            return;
        }

        current.count += 1;
        next();
    };
}

export const standaloneCors = cors;
