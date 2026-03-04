/**
 * Proxy Client Error Classes
 * 
 * Ошибки для ProxyClient
 */

import type {RateLimitStatus} from './proxy-client.types.js';

export class HttpError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly body?: string,
        public readonly headers?: Record<string, string>
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

export class CircuitBreakerError extends Error {
    constructor(
        message: string,
        public readonly serviceName: string,
        public readonly state: 'open' | 'half_open'
    ) {
        super(message);
        this.name = 'CircuitBreakerError';
    }
}

export class RateLimitError extends Error {
    constructor(
        message: string,
        public readonly retryAfter: number,
        public readonly rateLimitStatus: RateLimitStatus
    ) {
        super(message);
        this.name = 'RateLimitError';
    }
}
