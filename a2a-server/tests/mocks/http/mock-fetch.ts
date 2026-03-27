/**
 * HTTP Mock for Tests
 * 
 * Provides mock implementation for fetch() with:
 * - Preset responses for specific URLs
 * - Wildcard URL matching
 * - Request recording
 */

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
    /** Number of times this response can be used (-1 for unlimited) */
    uses?: number;
    /** Delay in ms before returning response */
    delay?: number;
}

export interface MockFetchConfig {
    /** Default response when no URL matches */
    defaultResponse?: MockFetchResponse;
    /** Enable request logging */
    verbose?: boolean;
}

/**
 * Mock fetch implementation
 */
export class MockFetch {
    private mocks: MockFetchOptions[] = [];
    private requests: Array<{ url: string; options: RequestInit }> = [];
    private callCount = 0;
    private config: MockFetchConfig;

    constructor(config: MockFetchConfig = {}) {
        this.config = config;
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
     * Find a matching mock for a URL
     */
    private findMatchingMock(url: string): MockFetchOptions | undefined {
        for (const mock of this.mocks) {
            if (this.matchesUrl(url, mock.url)) {
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
        return async (url: string, options: RequestInit = {}): Promise<Response> => {
            this.callCount++;
            this.requests.push({ url, options });

            if (this.config.verbose) {
                console.log('[MockFetch]', options.method || 'GET', url);
            }

            const mock = this.findMatchingMock(url);

            if (mock) {
                if (mock.uses !== undefined && mock.uses > 0) {
                    mock.uses--;
                }

                if (mock.delay && mock.delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, mock.delay));
                }

                return this.createResponse(mock.response);
            }

            // Return default response or throw
            if (this.config.defaultResponse) {
                return this.createResponse(this.config.defaultResponse);
            }

            throw new Error(`[MockFetch] No mock found for URL: ${url}`);
        };
    }

    /**
     * Get all recorded requests
     */
    getRequests(): Array<{ url: string; options: RequestInit }> {
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
    wasRequested(url: string | RegExp): boolean {
        return this.requests.some(req => this.matchesUrl(req.url, url));
    }

    /**
     * Get the last request
     */
    getLastRequest(): { url: string; options: RequestInit } | undefined {
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
 * Common mock responses for testing
 */
export const commonMocks = {
    okJson: (data: object): MockFetchResponse => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/json' },
        json: async () => data
    }),

    createdJson: (data: object): MockFetchResponse => ({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: { 'Content-Type': 'application/json' },
        json: async () => data
    }),

    notFound: (): MockFetchResponse => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not found' })
    }),

    error: (status: number, message: string): MockFetchResponse => ({
        ok: false,
        status,
        statusText: message,
        json: async () => ({ error: message })
    }),

    timeout: (): MockFetchResponse => ({
        ok: false,
        status: 408,
        statusText: 'Request Timeout'
    })
};
