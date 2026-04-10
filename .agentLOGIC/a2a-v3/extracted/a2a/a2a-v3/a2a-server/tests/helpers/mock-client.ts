/**
 * Mock A2A Client SDK for Tests
 * 
 * Provides a mock implementation of the a2a-client SDK:
 * - invoke() - Invoke a request
 * - getTaskStatus() - Get task status
 * - subscribe() - Subscribe to task updates
 * - Record/replay mode support
 */

import { vi } from 'vitest';

export interface InvokeParams {
    context: Record<string, any>;
    message: string;
    requestFiles?: string[];
}

export interface InvokeResponse {
    success: boolean;
    data: {
        id: string;
        promiseId: string;
        status: 'pending' | 'processing' | 'completed' | 'error';
        execute?: any;
    };
}

export interface TaskStatusResponse {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    progress?: number;
    result?: any;
    error?: string;
}

export interface SubscribeResponse {
    subscriptionId: string;
    status: 'subscribed' | 'error';
}

export interface MockClientConfig {
    /** Base URL for requests */
    baseUrl?: string;
    /** Delay responses in ms */
    delay?: number;
    /** Enable request logging */
    verbose?: boolean;
}

export interface ClientRequest {
    method: string;
    params: any;
    timestamp: Date;
}

export interface ResponseScenario {
    /** Match condition */
    match: (params: any) => boolean;
    /** Response to return */
    response: any;
    /** Number of uses (-1 for unlimited) */
    uses?: number;
}

/**
 * Mock A2A Client
 */
export class MockA2AClient {
    private requests: ClientRequest[] = [];
    private scenarios: ResponseScenario[] = [];
    private config: MockClientConfig;
    private callCount = 0;

    constructor(config: MockClientConfig = {}) {
        this.config = {
            baseUrl: 'http://localhost:3000',
            delay: 0,
            verbose: false,
            ...config
        };
    }

    /**
     * Add a response scenario
     */
    addScenario(scenario: ResponseScenario): void {
        this.scenarios.push({
            uses: -1,
            ...scenario
        });
    }

    /**
     * Clear all scenarios
     */
    clearScenarios(): void {
        this.scenarios = [];
    }

    /**
     * Find matching scenario
     */
    private findScenario(params: any): any | undefined {
        for (const scenario of this.scenarios) {
            if (scenario.match(params)) {
                if (scenario.uses === undefined || scenario.uses === -1 || scenario.uses > 0) {
                    return scenario.response;
                }
            }
        }
        return undefined;
    }

    /**
     * Record a request
     */
    private recordRequest(method: string, params: any): void {
        this.callCount++;
        this.requests.push({
            method,
            params,
            timestamp: new Date()
        });

        if (this.config.verbose) {
            console.log('[MockClient]', method, JSON.stringify(params, null, 2));
        }
    }

    /**
     * Delay response
     */
    private async delay(): Promise<void> {
        if (this.config.delay && this.config.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.delay));
        }
    }

    /**
     * Invoke a request
     */
    async invoke(params: InvokeParams): Promise<InvokeResponse> {
        this.recordRequest('invoke', params);

        // Check for matching scenario
        const scenarioResponse = this.findScenario(params);
        if (scenarioResponse) {
            await this.delay();
            return scenarioResponse as InvokeResponse;
        }

        // Default response
        await this.delay();
        return {
            success: true,
            data: {
                id: `mock-${Date.now()}`,
                promiseId: `promise-${Date.now()}`,
                status: 'pending'
            }
        };
    }

    /**
     * Get task status
     */
    async getTaskStatus(promiseId: string): Promise<TaskStatusResponse> {
        this.recordRequest('getTaskStatus', { promiseId });

        const scenarioResponse = this.findScenario({ promiseId });
        if (scenarioResponse) {
            await this.delay();
            return scenarioResponse as TaskStatusResponse;
        }

        await this.delay();
        return {
            id: promiseId,
            status: 'pending',
            progress: 0
        };
    }

    /**
     * Subscribe to task updates
     */
    async subscribe(promiseId: string, _callback?: (update: any) => void): Promise<SubscribeResponse> {
        this.recordRequest('subscribe', { promiseId });

        const scenarioResponse = this.findScenario({ promiseId, subscribe: true });
        if (scenarioResponse) {
            await this.delay();
            return scenarioResponse as SubscribeResponse;
        }

        await this.delay();
        return {
            subscriptionId: `sub-${Date.now()}`,
            status: 'subscribed'
        };
    }

    /**
     * Get request history
     */
    getRequests(): ClientRequest[] {
        return [...this.requests];
    }

    /**
     * Get call count
     */
    getCallCount(): number {
        return this.callCount;
    }

    /**
     * Check if a method was called
     */
    wasCalled(method: string): boolean {
        return this.requests.some(r => r.method === method);
    }

    /**
     * Get last request
     */
    getLastRequest(): ClientRequest | undefined {
        return this.requests[this.requests.length - 1];
    }

    /**
     * Clear request history
     */
    clearRequests(): void {
        this.requests = [];
        this.callCount = 0;
    }

    /**
     * Reset everything
     */
    reset(): void {
        this.clearRequests();
        this.clearScenarios();
    }

    /**
     * Get vitest mock functions
     */
    getMocks() {
        return {
            invoke: vi.fn((params: InvokeParams) => this.invoke(params)),
            getTaskStatus: vi.fn((promiseId: string) => this.getTaskStatus(promiseId)),
            subscribe: vi.fn((promiseId: string) => this.subscribe(promiseId))
        };
    }
}

/**
 * Create a mock client instance
 */
export function createMockClient(config?: MockClientConfig): MockA2AClient {
    return new MockA2AClient(config);
}

/**
 * Common test scenarios
 */
export const commonScenarios = {
    immediateComplete: (result?: any): ResponseScenario => ({
        match: () => true,
        response: {
            success: true,
            data: {
                id: 'test-id',
                promiseId: 'test-promise',
                status: 'completed',
                result: result || { 'message': { text: 'Done' } }
            }
        }
    }),

    pendingThenComplete: (promiseId: string, completedPayload?: any): ResponseScenario[] => [
        {
            match: (_p: InvokeParams) => true,
            response: {
                success: true,
                data: {
                    id: promiseId,
                    promiseId,
                    status: 'pending'
                }
            }
        },
        {
            match: (p: { promiseId: string }) => p.promiseId === promiseId,
            response: {
                id: promiseId,
                status: 'completed',
                result: completedPayload || { 'message': { text: 'Done' } }
            }
        }
    ],

    withForm: (): ResponseScenario => ({
        match: () => true,
        response: {
            success: true,
            data: {
                id: 'test-id',
                promiseId: 'test-promise',
                status: 'pending',
                execute: {
                    form: {
                        id: 'confirm',
                        title: 'Подтвердите',
                        choices: [
                            { id: 'yes', label: 'Да' },
                            { id: 'no', label: 'Нет' }
                        ]
                    }
                }
            }
        }
    }),

    error: (message: string): ResponseScenario => ({
        match: () => true,
        response: {
            success: false,
            error: message
        }
    })
};

/**
 * Setup mock client for vi.mock
 */
export function setupMockClient(mocks?: {
    invoke?: InvokeResponse;
    getTaskStatus?: TaskStatusResponse;
    subscribe?: SubscribeResponse;
}): {
    invoke: ReturnType<typeof vi.fn>;
    getTaskStatus: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
} {
    return {
        invoke: mocks?.invoke ? vi.fn(() => Promise.resolve(mocks.invoke)) : vi.fn(),
        getTaskStatus: mocks?.getTaskStatus ? vi.fn(() => Promise.resolve(mocks.getTaskStatus)) : vi.fn(),
        subscribe: mocks?.subscribe ? vi.fn(() => Promise.resolve(mocks.subscribe)) : vi.fn()
    };
}
