/**
 * HTTP Mock for a2a-client SDK Tests
 * 
 * Provides mock implementation for fetch() with:
 * - Preset responses for specific URLs
 * - Wildcard URL matching
 * - Request recording
 * - Dynamic response generation
 */

import { vi } from 'vitest';

export interface MockFetchResponse {
    ok?: boolean;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: string | object;
    json?: () => Promise<any>;
    text?: () => Promise<string>;
}

export interface MockFetchOptions {
    /** URL or pattern to match */
    url: string | RegExp;
    /** Response to return */
    response: MockFetchResponse;
    /** HTTP method to match (default: any) */
    method?: string;
    /** Number of times this response can be used (-1 for unlimited) */
    uses?: number;
    /** Delay in ms before returning response */
    delay?: number;
    /** Dynamic response generator */
    dynamicResponse?: (request: { url: string; options: RequestInit }) => MockFetchResponse;
}

export interface MockFetchConfig {
    /** Default response when no URL matches */
    defaultResponse?: MockFetchResponse;
    /** Enable request logging */
    verbose?: boolean;
    /** Throw error on unmatched URL */
    throwOnUnmatched?: boolean;
}

/**
 * Mock fetch implementation for a2a-client SDK
 */
export class MockFetch {
    private mocks: MockFetchOptions[] = [];
    private requests: Array<{ url: string; method: string; options: RequestInit }> = [];
    private callCount = 0;
    private config: MockFetchConfig;

    constructor(config: MockFetchConfig = {}) {
        this.config = {
            throwOnUnmatched: true,
            verbose: false,
            ...config
        };
    }

    /**
     * Add a mock response for a URL
     */
    addMock(mock: MockFetchOptions): void {
        this.mocks.push({
            uses: -1,
            delay: 0,
            ...mock
        });
    }

    /**
     * Add multiple mocks at once
     */
    addMocks(mocks: MockFetchOptions[]): void {
        for (const mock of mocks) {
            this.addMock(mock);
        }
    }

    /**
     * Add mock for invoke endpoint
     */
    addInvokeMock(response: MockFetchResponse): void {
        this.addMock({
            url: /\/api\/v1\/invoke$/,
            method: 'POST',
            response
        });
    }

    /**
     * Add mock for status endpoint
     */
    addStatusMock(promiseId: string | RegExp, response: MockFetchResponse): void {
        const url = typeof promiseId === 'string' 
            ? new RegExp(`/api/v1/requests/${promiseId}/status$`)
            : promiseId;
        this.addMock({
            url,
            method: 'GET',
            response
        });
    }

    /**
     * Remove a mock by URL
     */
    removeMock(url: string | RegExp): void {
        this.mocks = this.mocks.filter(m => {
            if (typeof m.url === 'string') {
                return m.url !== url;
            }
            return !(m.url instanceof RegExp && url instanceof RegExp && 
                     m.url.source === url.source && m.url.flags === url.flags);
        });
    }

    /**
     * Clear all mocks
     */
    clearMocks(): void {
        this.mocks = [];
    }

    /**
     * Check if a URL matches a pattern
     */
    private matchesUrl(url: string, pattern: string | RegExp): boolean {
        if (typeof pattern === 'string') {
            // Support wildcards with *
            if (pattern.includes('*')) {
                const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
                return regex.test(url);
            }
            return url === pattern;
        }
        return pattern.test(url);
    }

    /**
     * Check if HTTP method matches
     */
    private matchesMethod(requestMethod: string, mockMethod?: string): boolean {
        if (!mockMethod) return true; // Any method
        return requestMethod.toUpperCase() === mockMethod.toUpperCase();
    }

    /**
     * Find a matching mock for a URL and method
     */
    private findMatchingMock(url: string, method: string): MockFetchOptions | undefined {
        for (const mock of this.mocks) {
            if (this.matchesUrl(url, mock.url) && this.matchesMethod(method, mock.method)) {
                if (mock.uses === undefined || mock.uses === -1 || mock.uses > 0) {
                    return mock;
                }
            }
        }
        return undefined;
    }

    /**
     * Create a mock Response object
     */
    private createResponse(mock: MockFetchResponse): Response {
        const headers = new Headers(mock.headers || {});
        const body = mock.body;
        
        return {
            ok: mock.ok ?? true,
            status: mock.status ?? 200,
            statusText: mock.statusText ?? 'OK',
            headers,
            body: body as any,
            json: async () => {
                if (mock.json) return mock.json();
                if (typeof body === 'string') return JSON.parse(body);
                if (typeof body === 'object') return body;
                return {};
            },
            text: async () => {
                if (mock.text) return mock.text();
                if (typeof body === 'string') return body;
                if (typeof body === 'object') return JSON.stringify(body);
                return '';
            },
        } as unknown as Response;
    }

    /**
     * Get the mock fetch function
     */
    getMock(): typeof fetch {
        const self = this;
        
        return async (url: string, options: RequestInit = {}): Promise<Response> => {
            self.callCount++;
            const method = options.method || 'GET';
            self.requests.push({ url, method, options });

            if (self.config.verbose) {
                console.log('[MockFetch]', method, url);
            }

            const mock = self.findMatchingMock(url, method);

            if (mock) {
                if (mock.uses !== undefined && mock.uses > 0) {
                    mock.uses--;
                }

                if (mock.delay && mock.delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, mock.delay));
                }

                // Use dynamic response if provided
                if (mock.dynamicResponse) {
                    const dynamic = mock.dynamicResponse({ url, options });
                    return self.createResponse(dynamic);
                }

                return self.createResponse(mock.response);
            }

            // Return default response or throw
            if (self.config.defaultResponse) {
                return self.createResponse(self.config.defaultResponse);
            }

            if (self.config.throwOnUnmatched) {
                throw new Error(`[MockFetch] No mock found for URL: ${method} ${url}`);
            }

            // Return 404
            return self.createResponse({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({ error: 'Not found', url })
            });
        };
    }

    /**
     * Get all recorded requests
     */
    getRequests(): Array<{ url: string; method: string; options: RequestInit }> {
        return [...this.requests];
    }

    /**
     * Get request count
     */
    getCallCount(): number {
        return this.callCount;
    }

    /**
     * Check if a URL was requested
     */
    wasRequested(url: string | RegExp, method?: string): boolean {
        return this.requests.some(req => 
            this.matchesUrl(req.url, url) && 
            (!method || req.method.toUpperCase() === method.toUpperCase())
        );
    }

    /**
     * Get the last request
     */
    getLastRequest(): { url: string; method: string; options: RequestInit } | undefined {
        return this.requests[this.requests.length - 1];
    }

    /**
     * Reset recorded requests
     */
    resetRequests(): void {
        this.requests = [];
        this.callCount = 0;
    }

    /**
     * Reset everything
     */
    reset(): void {
        this.clearMocks();
        this.resetRequests();
    }
}

/**
 * Global mock fetch instance
 */
let globalMockFetch: MockFetch | null = null;

/**
 * Setup global mock fetch
 */
export function setupMockFetch(config?: MockFetchConfig): MockFetch {
    globalMockFetch = new MockFetch(config);
    return globalMockFetch;
}

/**
 * Get global mock fetch instance
 */
export function getMockFetch(): MockFetch | null {
    return globalMockFetch;
}

/**
 * Create a mock fetch function for vi.mock
 */
export function createMockFetchFn(mocks: MockFetchOptions[] = []): typeof fetch {
    const mockFetch = new MockFetch();
    mockFetch.addMocks(mocks);
    return mockFetch.getMock();
}

/**
 * Common mock responses for a2a-client testing
 */
export const commonMocks = {
    okJson: (data: object): MockFetchResponse => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        json: async () => data
    }),

    invokeResponse: (promiseId = 'promise_001', result?: object): MockFetchResponse => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        json: async () => ({
            success: true,
            promiseId,
            result: result || { 'form': { message: 'Success' } }
        })
    }),

    statusResponse: (status: 'pending' | 'processing' | 'completed' | 'failed', result?: object): MockFetchResponse => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        json: async () => ({
            success: true,
            status,
            result
        })
    }),

    createdJson: (data: object): MockFetchResponse => ({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: { 'Content-Type': 'application/json' },
        json: async () => data
    }),

    notFound: (message = 'Not found'): MockFetchResponse => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ success: false, error: { message } })
    }),

    error: (status: number, message: string): MockFetchResponse => ({
        ok: false,
        status,
        statusText: message,
        json: async () => ({ success: false, error: { message } })
    }),

    timeout: (): MockFetchResponse => ({
        ok: false,
        status: 408,
        statusText: 'Request Timeout',
        json: async () => ({ success: false, error: { message: 'Request timeout' } })
    }),

    serverError: (message = 'Internal Server Error'): MockFetchResponse => ({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ success: false, error: { message } })
    })
};

/**
 * Helper to create mock with dynamic response
 */
export function createDynamicMock(
    url: string | RegExp,
    generator: (request: { url: string; options: RequestInit }) => object
): MockFetchOptions {
    return {
        url,
        response: {},
        dynamicResponse: (req) => ({
            ok: true,
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            json: async () => generator(req)
        })
    };
}
