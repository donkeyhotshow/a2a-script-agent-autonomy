/**
 * Mock A2A Server for Tests
 * 
 * Lightweight Express server for unit/integration tests:
 * - /api/v1/invoke - Invoke a request
 * - /api/v1/requests/:id/status - Get task status
 * - Configurable responses
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import request, { type SuperTest, type Test } from 'supertest';

export interface MockServerConfig {
    /** Port to run server on (default: 0 = random) */
    port?: number;
    /** Delay responses in ms */
    delay?: number;
    /** Enable request logging */
    verbose?: boolean;
}

export interface MockResponse {
    /** Response status code */
    status?: number;
    /** Response body */
    body?: any;
    /** Custom response function */
    handler?: (req: Request, res: Response) => void;
}

export interface RequestRecord {
    method: string;
    path: string;
    body?: any;
    params?: Record<string, string>;
    query?: Record<string, string>;
    timestamp: Date;
}

/**
 * Mock A2A Server
 */
export class MockA2AServer {
    private app: Express;
    private responses: Map<string, MockResponse> = new Map();
    private requests: RequestRecord[] = [];
    private config: MockServerConfig;
    private server: any = null;

    constructor(config: MockServerConfig = {}) {
        this.config = {
            port: 0,
            delay: 0,
            verbose: false,
            ...config
        };
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(express.json());
        
        // Request logging
        this.app.use((req: Request, _res: Response, next: NextFunction) => {
            this.requests.push({
                method: req.method,
                path: req.path,
                body: req.body,
                params: req.params,
                query: req.query,
                timestamp: new Date()
            });
            
            if (this.config.verbose) {
                console.log('[MockServer]', req.method, req.path, req.body);
            }
            
            next();
        });
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (_req: Request, res: Response) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // POST /api/v1/invoke - Invoke a request
        this.app.post('/api/v1/invoke', (req: Request, res: Response) => {
            const key = this.generateKey('invoke', req.body);
            const mockResponse = this.responses.get(key);
            
            if (mockResponse?.handler) {
                return mockResponse.handler(req, res);
            }
            
            this.delayResponse(() => {
                if (mockResponse?.body) {
                    res.status(mockResponse.status || 201).json(mockResponse.body);
                } else {
                    // Default response
                    res.status(201).json({
                        success: true,
                        data: {
                            id: `mock-${Date.now()}`,
                            promiseId: `promise-${Date.now()}`,
                            status: 'pending'
                        }
                    });
                }
            });
        });

        // GET /api/v1/requests/:id/status - Get task status
        this.app.get('/api/v1/requests/:id/status', (req: Request, res: Response) => {
            const key = this.generateKey('status', { id: req.params.id });
            const mockResponse = this.responses.get(key);
            
            if (mockResponse?.handler) {
                return mockResponse.handler(req, res);
            }
            
            this.delayResponse(() => {
                if (mockResponse?.body) {
                    res.status(mockResponse.status || 200).json(mockResponse.body);
                } else {
                    // Default response
                    res.status(200).json({
                        id: req.params.id,
                        status: 'pending',
                        progress: 0
                    });
                }
            });
        });

        // GET /api/v1/requests/:id - Get full task
        this.app.get('/api/v1/requests/:id', (req: Request, res: Response) => {
            const key = this.generateKey('get', { id: req.params.id });
            const mockResponse = this.responses.get(key);
            
            this.delayResponse(() => {
                if (mockResponse?.body) {
                    res.status(mockResponse.status || 200).json(mockResponse.body);
                } else {
                    res.status(200).json({
                        id: req.params.id,
                        status: 'pending',
                        result: null
                    });
                }
            });
        });

        // POST /api/v1/requests/:id/subscribe - Subscribe to task updates
        this.app.post('/api/v1/requests/:id/subscribe', (req: Request, res: Response) => {
            const key = this.generateKey('subscribe', { id: req.params.id });
            const mockResponse = this.responses.get(key);
            
            this.delayResponse(() => {
                if (mockResponse?.body) {
                    res.status(mockResponse.status || 200).json(mockResponse.body);
                } else {
                    res.status(200).json({
                        subscriptionId: `sub-${Date.now()}`,
                        status: 'subscribed'
                    });
                }
            });
        });

        // 404 handler
        this.app.use((_req: Request, res: Response) => {
            res.status(404).json({ error: 'Not found' });
        });
    }

    private generateKey(operation: string, data: any): string {
        return `${operation}:${JSON.stringify(data)}`;
    }

    private delayResponse(callback: () => void): void {
        if (this.config.delay && this.config.delay > 0) {
            setTimeout(callback, this.config.delay);
        } else {
            callback();
        }
    }

    /**
     * Set a mock response for an endpoint
     */
    mockResponse(key: string, response: MockResponse): void {
        this.responses.set(key, response);
    }

    /**
     * Set mock response for invoke endpoint
     */
    mockInvokeResponse(response: MockResponse): void {
        this.mockResponse('invoke:{}', response);
    }

    /**
     * Set mock response for status endpoint
     */
    mockStatusResponse(id: string, response: MockResponse): void {
        this.mockResponse(`status:{"id":"${id}"}`, response);
    }

    /**
     * Clear all mock responses
     */
    clearResponses(): void {
        this.responses.clear();
    }

    /**
     * Get recorded requests
     */
    getRequests(): RequestRecord[] {
        return [...this.requests];
    }

    /**
     * Get the last request
     */
    getLastRequest(): RequestRecord | undefined {
        return this.requests[this.requests.length - 1];
    }

    /**
     * Check if a request was made
     */
    wasRequested(method: string, path: string): boolean {
        return this.requests.some(r => r.method === method && r.path === path);
    }

    /**
     * Clear recorded requests
     */
    clearRequests(): void {
        this.requests = [];
    }

    /**
     * Get the Express app
     */
    getApp(): Express {
        return this.app;
    }

    /**
     * Get SuperTest agent for testing
     */
    request(): SuperTest<Test> {
        return request(this.app);
    }

    /**
     * Start the server
     */
    async start(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.config.port, () => {
                const address = this.server.address();
                const port = typeof address === 'object' ? address?.port : 0;
                resolve(port || 0);
            });
            
            this.server.on('error', reject);
        });
    }

    /**
     * Stop the server
     */
    async stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((err: Error) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Reset everything
     */
    reset(): void {
        this.clearResponses();
        this.clearRequests();
    }
}

/**
 * Create a mock server instance
 */
export function createMockServer(config?: MockServerConfig): MockA2AServer {
    return new MockA2AServer(config);
}

/**
 * Common mock responses for testing
 */
export const commonMockResponses = {
    invokeSuccess: (promiseId?: string) => ({
        status: 201,
        body: {
            success: true,
            data: {
                id: promiseId || `mock-${Date.now()}`,
                promiseId: promiseId || `promise-${Date.now()}`,
                status: 'pending'
            }
        }
    }),

    invokeWithForm: (promiseId?: string) => ({
        status: 201,
        body: {
            success: true,
            data: {
                id: promiseId || `mock-${Date.now()}`,
                promiseId: promiseId || `promise-${Date.now()}`,
                status: 'pending',
                execute: {
                    form: {
                        id: 'confirm_action',
                        title: 'Подтвердите действие',
                        choices: [
                            { id: 'confirm', label: 'Подтвердить' },
                            { id: 'cancel', label: 'Отмена' }
                        ]
                    }
                }
            }
        }
    }),

    statusCompleted: (id: string, result?: any) => ({
        status: 200,
        body: {
            id,
            status: 'completed',
            result: result || { 'message': { text: 'Operation completed' } }
        }
    }),

    statusPending: (id: string) => ({
        status: 200,
        body: {
            id,
            status: 'pending',
            progress: 50
        }
    }),

    statusError: (id: string, error: string) => ({
        status: 200,
        body: {
            id,
            status: 'error',
            error
        }
    })
};
