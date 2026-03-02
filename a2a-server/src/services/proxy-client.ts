/**
 * Generic HTTP client for talking to the external AI proxy (ai-integration).
 *
 * This is a lightweight, fetch-based implementation aligned with the
 * server-proxy integration plan. It is intentionally generic and can be reused
 * by higher-level AI services.
 */

import {logger} from '../utils/logger.js';

export interface RetryConfig {
    retries: number;
    delayMs: number;
}

export interface ProxyClientConfig {
    baseUrl: string;
    apiKey?: string;
    timeoutMs?: number;
    retry?: RetryConfig;
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    requestId?: string;
    sessionId?: string;
    userId?: string;
    signal?: AbortSignal;
}

export class ProxyClient {
    private readonly baseUrl: string;
    private readonly apiKey?: string;
    private readonly timeoutMs: number;
    private readonly retry: RetryConfig;

    constructor(config: ProxyClientConfig) {
        if (!config.baseUrl) {
            throw new Error('ProxyClient: baseUrl is required');
        }

        this.baseUrl = config.baseUrl.replace(/\/+$/, '');
        this.apiKey = config.apiKey;
        this.timeoutMs = config.timeoutMs ?? 30_000;
        this.retry = config.retry ?? {retries: 2, delayMs: 1_000};
    }

    async sendJson<TResponse>(
        endpoint: string,
        payload: unknown,
        options: RequestOptions = {}
    ): Promise<TResponse> {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (this.apiKey) {
            headers.Authorization = `Bearer ${this.apiKey}`;
        }
        if (options.requestId) {
            headers['X-Request-ID'] = options.requestId;
        }
        if (options.sessionId) {
            headers['X-Session-ID'] = options.sessionId;
        }
        if (options.userId) {
            headers['X-User-ID'] = options.userId;
        }

        const method = options.method ?? 'POST';
        const body = method === 'GET' ? undefined : JSON.stringify(payload);

        const attemptRequest = async (): Promise<TResponse> => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                const res = await fetch(url, {
                    method,
                    headers,
                    body,
                    signal: options.signal ?? controller.signal,
                });

                if (res.status >= 500) {
                    throw new HttpError('Proxy server error', res.status);
                }

                if (!res.ok) {
                    const text = await res.text().catch(() => '');
                    throw new HttpError(
                        `Proxy request failed with status ${res.status}`,
                        res.status,
                        text || undefined
                    );
                }

                return (await res.json()) as TResponse;
            } finally {
                clearTimeout(timeout);
            }
        };

        return this.performWithRetry(attemptRequest, {url, method});
    }

    private async performWithRetry<T>(
        fn: () => Promise<T>,
        context: {url: string; method: string}
    ): Promise<T> {
        let lastError: unknown;

        for (let attempt = 0; attempt <= this.retry.retries; attempt += 1) {
            try {
                if (attempt > 0) {
                    logger.warn('[ProxyClient] retrying request', {
                        attempt,
                        url: context.url,
                        method: context.method,
                    });
                }
                return await fn();
            } catch (error) {
                lastError = error;

                const isLastAttempt = attempt === this.retry.retries;
                if (isLastAttempt || !this.shouldRetry(error)) {
                    break;
                }

                const delayMs = this.retry.delayMs * 2 ** attempt;
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        logger.error('[ProxyClient] request failed', {
            url: context.url,
            method: context.method,
            error: String(lastError),
        });

        throw lastError instanceof Error
            ? lastError
            : new Error(`ProxyClient request failed: ${String(lastError)}`);
    }

    private shouldRetry(error: unknown): boolean {
        if (error instanceof HttpError) {
            // Do not retry on client errors (4xx)
            return error.statusCode >= 500;
        }

        // For network / timeout errors we optimistically retry
        return true;
    }
}

export class HttpError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number,
        public readonly body?: string
    ) {
        super(message);
        this.name = 'HttpError';
    }
}

