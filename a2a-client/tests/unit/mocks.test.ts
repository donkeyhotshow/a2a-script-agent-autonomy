/**
 * Unit Tests for Mock A2A Server
 * 
 * Tests the mock server implementation using Vitest.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    MockA2AServer, 
    createMockA2AServer,
    serverFixtures 
} from '../mocks/server/mock-a2a-server.js';

describe('MockA2AServer', () => {
    let server: MockA2AServer;

    beforeEach(() => {
        server = createMockA2AServer({ verbose: false });
    });

    describe('handleInvoke', () => {
        it('should handle invoke request and return promise ID', async () => {
            const request = serverFixtures.invokeRequest();
            const response = await server.handleInvoke(request);

            expect(response.success).toBe(true);
            expect(response.promiseId).toBeDefined();
            expect(response.result).toBeDefined();
        });

        it('should use custom invoke handler', async () => {
            const customResponse = {
                success: true,
                promiseId: 'custom_promise',
                result: { 'custom': { data: 'test' } }
            };
            
            server.setInvokeHandler(() => customResponse);
            
            const response = await server.handleInvoke({});
            expect(response).toEqual(customResponse);
        });

        it('should record invoke requests', async () => {
            await server.handleInvoke(serverFixtures.invokeRequest());
            
            const requests = server.getRequests();
            expect(requests).toHaveLength(1);
            expect(requests[0].endpoint).toBe('/api/v1/invoke');
            expect(requests[0].method).toBe('POST');
        });

        it('should support response delay', async () => {
            const serverWithDelay = createMockA2AServer({ delay: 100 });
            
            const start = Date.now();
            await serverWithDelay.handleInvoke({});
            const elapsed = Date.now() - start;
            
            expect(elapsed).toBeGreaterThanOrEqual(90);
        });
    });

    describe('handleStatus', () => {
        it('should return status for existing promise', async () => {
            server.addPendingPromise('promise_001', {
                success: true,
                status: 'completed',
                result: { 'message': { text: 'Done' } }
            });

            const response = await server.handleStatus('promise_001');
            
            expect(response.success).toBe(true);
            expect(response.status).toBe('completed');
        });

        it('should use custom status handler', async () => {
            const customResponse = {
                success: true,
                status: 'processing' as const
            };
            
            server.setStatusHandler(() => customResponse);
            
            const response = await server.handleStatus('any_id');
            expect(response).toEqual(customResponse);
        });

        it('should return default status for unknown promise', async () => {
            const response = await server.handleStatus('unknown_promise');
            
            expect(response.success).toBe(true);
            expect(response.status).toBe('completed');
        });
    });

    describe('handleSSE', () => {
        it('should yield messages from session', async () => {
            const messages = [
                { event: 'message', data: { text: 'Hello' } },
                { event: 'message', data: { text: 'World' } }
            ];
            server.addSessionData('session_001', messages);

            const result = await server.handleSSE('session_001');
            const received: any[] = [];
            
            for await (const msg of result) {
                received.push(msg);
            }

            expect(received).toHaveLength(2);
            expect(received[0].data.text).toBe('Hello');
        });
    });

    describe('getMockFetchFn', () => {
        it('should return a fetch-like function', async () => {
            const mockFetch = server.getMockFetchFn();
            
            expect(typeof mockFetch).toBe('function');
        });

        it('should handle invoke endpoint via fetch', async () => {
            const mockFetch = server.getMockFetchFn();
            
            const response = await mockFetch('http://localhost:3000/api/v1/invoke', {
                method: 'POST',
                body: JSON.stringify(serverFixtures.invokeRequest())
            });
            
            const data = await response.json();
            expect(data.success).toBe(true);
            expect(data.promiseId).toBeDefined();
        });

        it('should handle status endpoint via fetch', async () => {
            const mockFetch = server.getMockFetchFn();
            server.addPendingPromise('test_promise', {
                success: true,
                status: 'completed'
            });
            
            const response = await mockFetch('http://localhost:3000/api/v1/requests/test_promise/status');
            
            expect(response.ok).toBe(true);
            const data = await response.json();
            expect(data.status).toBe('completed');
        });

        it('should return 404 for unknown endpoint', async () => {
            const mockFetch = server.getMockFetchFn();
            
            const response = await mockFetch('http://localhost:3000/api/v1/unknown');
            
            expect(response.status).toBe(404);
        });
    });

    describe('reset', () => {
        it('should clear all recorded data', async () => {
            await server.handleInvoke({});
            await server.handleStatus('test');
            
            server.reset();
            
            expect(server.getRequests()).toHaveLength(0);
            expect(server.getCallCount()).toBe(0);
        });
    });
});
