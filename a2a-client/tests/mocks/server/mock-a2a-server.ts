/**
 * Mock A2A Server for SDK Tests
 * 
 * Emulates A2A server behavior on port 3000 for testing SDK interactions.
 * Supports endpoints: /api/v1/invoke, /api/v1/requests/:id/status, /api/v1/sse/:sessionId
 */

import { vi } from 'vitest';

export interface A2ARequest {
    sessionId?: string;
    context?: Record<string, unknown>;
    execute?: Record<string, unknown>;
}

export interface A2AResponse {
    success?: boolean;
    promiseId?: string;
    result?: Record<string, unknown>;
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    message?: string;
    error?: { message: string; code?: string };
}

export interface A2AEndpointHandlers {
    onInvoke?: (request: A2ARequest) => A2AResponse | Promise<A2AResponse>;
    onStatus?: (promiseId: string) => A2AResponse | Promise<A2AResponse>;
    onSSE?: (sessionId: string) => AsyncIterable<any> | null;
}

export interface MockA2AServerConfig {
    /** Server base URL */
    baseUrl?: string;
    /** Response delay in ms */
    delay?: number;
    /** Custom endpoint handlers */
    handlers?: A2AEndpointHandlers;
    /** Default response for invoke */
    defaultInvokeResponse?: A2AResponse;
    /** Default response for status */
    defaultStatusResponse?: A2AResponse;
    /** Enable verbose logging */
    verbose?: boolean;
}

/**
 * Mock A2A Server class
 */
export class MockA2AServer {
    private config: Required<MockA2AServerConfig>;
    private requests: Array<{ endpoint: string; method: string; body?: unknown }> = [];
    private pendingPromises: Map<string, A2AResponse> = new Map();
    private sessions: Map<string, any[]> = new Map();
    private callCount = 0;

    constructor(config: MockA2AServerConfig = {}) {
        this.config = {
            baseUrl: config.baseUrl || 'http://localhost:3000',
            delay: config.delay || 0,
            handlers: config.handlers || {},
            defaultInvokeResponse: config.defaultInvokeResponse || {
                success: true,
                promiseId: 'mock_promise_001',
                result: { 'form': { message: 'Hello from mock server!' } }
            },
            defaultStatusResponse: config.defaultStatusResponse || {
                success: true,
                status: 'completed',
                result: { 'message': { text: 'Operation completed' } }
            },
            verbose: config.verbose || false
        };
    }

    /**
     * Set custom handler for invoke endpoint
     */
    setInvokeHandler(handler: A2AEndpointHandlers['onInvoke']): void {
        this.config.handlers.onInvoke = handler;
    }

    /**
     * Set custom handler for status endpoint
     */
    setStatusHandler(handler: A2AEndpointHandlers['onStatus']): void {
        this.config.handlers.onStatus = handler;
    }

    /**
     * Set custom handler for SSE endpoint
     */
    setSSEHandler(handler: A2AEndpointHandlers['onSSE']): void {
        this.config.handlers.onSSE = handler;
    }

    /**
     * Add a pending promise for testing
     */
    addPendingPromise(promiseId: string, response: A2AResponse): void {
        this.pendingPromises.set(promiseId, response);
    }

    /**
     * Add session data for testing
     */
    addSessionData(sessionId: string, messages: any[]): void {
        this.sessions.set(sessionId, messages);
    }

    /**
     * Get all recorded requests
     */
    getRequests(): Array<{ endpoint: string; method: string; body?: unknown }> {
        return [...this.requests];
    }

    /**
     * Get call count
     */
    getCallCount(): number {
        return this.callCount;
    }

    /**
     * Reset all recorded data
     */
    reset(): void {
        this.requests = [];
        this.pendingPromises.clear();
        this.sessions.clear();
        this.callCount = 0;
    }

    /**
     * Simulate invoke endpoint POST /api/v1/invoke
     */
    async handleInvoke(request: A2ARequest): Promise<A2AResponse> {
        this.callCount++;
        this.requests.push({ endpoint: '/api/v1/invoke', method: 'POST', body: request });

        if (this.config.verbose) {
            console.log('[MockA2AServer] POST /api/v1/invoke', request);
        }

        if (this.config.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.delay));
        }

        if (this.config.handlers.onInvoke) {
            return this.config.handlers.onInvoke(request);
        }

        // Default: create a new promise ID
        const promiseId = `promise_${Date.now()}`;
        this.pendingPromises.set(promiseId, {
            success: true,
            status: 'completed',
            ...this.config.defaultInvokeResponse,
            promiseId
        });

        return {
            success: true,
            promiseId,
            result: this.config.defaultInvokeResponse.result
        };
    }

    /**
     * Simulate status endpoint GET /api/v1/requests/:id/status
     */
    async handleStatus(promiseId: string): Promise<A2AResponse> {
        this.callCount++;
        this.requests.push({ endpoint: `/api/v1/requests/${promiseId}/status`, method: 'GET' });

        if (this.config.verbose) {
            console.log('[MockA2AServer] GET /api/v1/requests/:id/status', promiseId);
        }

        if (this.config.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.delay));
        }

        if (this.config.handlers.onStatus) {
            return this.config.handlers.onStatus(promiseId);
        }

        // Check if we have a stored promise response
        const stored = this.pendingPromises.get(promiseId);
        if (stored) {
            return stored;
        }

        return {
            success: true,
            status: 'completed',
            result: this.config.defaultStatusResponse.result
        };
    }

    /**
     * Simulate SSE endpoint GET /api/v1/sse/:sessionId
     */
    async *handleSSE(sessionId: string): Promise<AsyncIterable<any>> {
        this.callCount++;
        this.requests.push({ endpoint: `/api/v1/sse/${sessionId}`, method: 'GET' });

        if (this.config.verbose) {
            console.log('[MockA2AServer] GET /api/v1/sse/:sessionId', sessionId);
        }

        if (this.config.handlers.onSSE) {
            const handler = this.config.handlers.onSSE(sessionId);
            if (handler) {
                yield* handler;
                return;
            }
        }

        // Default SSE stream
        const messages = this.sessions.get(sessionId) || [];
        for (const msg of messages) {
            yield msg;
            if (this.config.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, this.config.delay));
            }
        }
    }

    /**
     * Get mock fetch function for use with vitest
     */
    getMockFetchFn(): typeof fetch {
        const self = this;

        return async (url: string, options: RequestInit = {}): Promise<Response> => {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;

            let response: A2AResponse;
            let status = 200;
            let statusText = 'OK';

            try {
                // POST /api/v1/invoke
                if (options.method === 'POST' && pathname === '/api/v1/invoke') {
                    const body = options.body ? JSON.parse(options.body as string) : {};
                    response = await self.handleInvoke(body);
                }
                // GET /api/v1/requests/:id/status
                else if (options.method === 'GET' && pathname.match(/^\/api\/v1\/requests\/[^/]+\/status$/)) {
                    const promiseId = pathname.split('/')[4];
                    response = await self.handleStatus(promiseId);
                }
                // GET /api/v1/sse/:sessionId
                else if (options.method === 'GET' && pathname.match(/^\/api\/v1\/sse\/[^/]+$/)) {
                    const sessionId = pathname.split('/')[4];
                    // For SSE, we return a mock event stream
                    const encoder = new TextEncoder();
                    const stream = new ReadableStream({
                        async start(controller) {
                            for await (const event of await self.handleSSE(sessionId)) {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
                            }
                            controller.close();
                        }
                    });
                    return new Response(stream, {
                        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
                    });
                }
                // Unknown endpoint
                else {
                    response = {
                        success: false,
                        error: { message: `Unknown endpoint: ${pathname}`, code: 'NOT_FOUND' }
                    };
                    status = 404;
                    statusText = 'Not Found';
                }
            } catch (error: any) {
                response = {
                    success: false,
                    error: { message: error.message || 'Internal Error', code: 'INTERNAL_ERROR' }
                };
                status = 500;
                statusText = 'Internal Server Error';
            }

            return new Response(JSON.stringify(response), {
                status,
                statusText,
                headers: { 'Content-Type': 'application/json' }
            });
        };
    }
}

/**
 * Create a mock A2A server instance
 */
export function createMockA2AServer(config?: MockA2AServerConfig): MockA2AServer {
    return new MockA2AServer(config);
}

/**
 * Global mock A2A server instance
 */
let globalMockServer: MockA2AServer | null = null;

/**
 * Setup global mock A2A server
 */
export function setupMockA2AServer(config?: MockA2AServerConfig): MockA2AServer {
    globalMockServer = new MockA2AServer(config);
    return globalMockServer;
}

/**
 * Get global mock A2A server instance
 */
export function getMockA2AServer(): MockA2AServer | null {
    return globalMockServer;
}

/**
 * Common test fixtures
 */
export const serverFixtures = {
    invokeRequest: (overrides?: Partial<A2ARequest>): A2ARequest => ({
        sessionId: 'session_001',
        context: {},
        execute: { 'message': { text: 'Hello' } },
        ...overrides
    }),

    invokeResponse: (overrides?: Partial<A2AResponse>): A2AResponse => ({
        success: true,
        promiseId: 'promise_001',
        status: 'completed',
        result: { 'form': { message: 'Response' } },
        ...overrides
    }),

    statusResponse: (status: 'pending' | 'processing' | 'completed' | 'failed' = 'completed'): A2AResponse => ({
        success: true,
        status,
        result: status === 'completed' ? { 'message': { text: 'Done' } } : undefined
    }),

    errorResponse: (message: string, code = 'ERROR'): A2AResponse => ({
        success: false,
        error: { message, code }
    })
};
