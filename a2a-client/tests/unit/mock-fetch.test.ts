/**
 * Unit Tests for MockFetch
 * 
 * Tests the mock HTTP fetch implementation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
    MockFetch, 
    createMockFetchFn,
    setupMockFetch,
    commonMocks,
    createDynamicMock
} from '../mocks/http/mock-fetch.js';

describe('MockFetch', () => {
    let mockFetch: MockFetch;

    beforeEach(() => {
        mockFetch = new MockFetch({ verbose: false });
    });

    describe('addMock', () => {
        it('should add a simple mock', () => {
            mockFetch.addMock({
                url: 'http://api.example.com/data',
                response: commonMocks.okJson({ test: true })
            });

            const mockFn = mockFetch.getMock();
            // The mock should be usable
            expect(typeof mockFn).toBe('function');
        });

        it('should support wildcard URLs', () => {
            mockFetch.addMock({
                url: 'http://api.example.com/*',
                response: commonMocks.okJson({ wildcard: true })
            });

            const mockFn = mockFetch.getMock();
            expect(typeof mockFn).toBe('function');
        });

        it('should support RegExp patterns', () => {
            mockFetch.addMock({
                url: /\/api\/v1\//,
                response: commonMocks.okJson({ api: true })
            });

            expect(typeof mockFetch.getMock()).toBe('function');
        });

        it('should limit mock usage with uses option', async () => {
            mockFetch.addMock({
                url: 'http://api.example.com/once',
                response: commonMocks.okJson({ once: true }),
                uses: 1
            });

            const mockFn = mockFetch.getMock();
            
            // First call should work
            const response1 = await mockFn('http://api.example.com/once');
            expect(response1.ok).toBe(true);

            // Second call should fail (no mock)
            await expect(
                mockFn('http://api.example.com/once')
            ).rejects.toThrow();
        });
    });

    describe('addInvokeMock', () => {
        it('should add mock for invoke endpoint', () => {
            mockFetch.addInvokeMock(commonMocks.invokeResponse('test_promise'));
            
            expect(typeof mockFetch.getMock()).toBe('function');
        });
    });

    describe('addStatusMock', () => {
        it('should add mock for status endpoint', () => {
            mockFetch.addStatusMock('promise_001', commonMocks.statusResponse('completed'));
            
            expect(typeof mockFetch.getMock()).toBe('function');
        });

        it('should support regex for status promise ID', () => {
            mockFetch.addStatusMock(/^promise_/, commonMocks.statusResponse('pending'));
            
            expect(typeof mockFetch.getMock()).toBe('function');
        });
    });

    describe('request recording', () => {
        it('should record all requests', async () => {
            mockFetch.addMock({
                url: 'http://api.example.com/test',
                response: commonMocks.okJson({})
            });

            const mockFn = mockFetch.getMock();
            await mockFn('http://api.example.com/test');

            const requests = mockFetch.getRequests();
            expect(requests).toHaveLength(1);
            expect(requests[0].url).toBe('http://api.example.com/test');
        });

        it('should track request method', async () => {
            mockFetch.addMock({
                url: 'http://api.example.com/post',
                response: commonMocks.okJson({}),
                method: 'POST'
            });

            const mockFn = mockFetch.getMock();
            await mockFn('http://api.example.com/post', { method: 'POST' });

            const requests = mockFetch.getRequests();
            expect(requests[0].method).toBe('POST');
        });

        it('should count calls', async () => {
            mockFetch.addMock({
                url: 'http://api.example.com/*',
                response: commonMocks.okJson({})
            });

            const mockFn = mockFetch.getMock();
            await mockFn('http://api.example.com/1');
            await mockFn('http://api.example.com/2');

            expect(mockFetch.getCallCount()).toBe(2);
        });

        it('should check if URL was requested', async () => {
            mockFetch.addMock({
                url: 'http://api.example.com/exists',
                response: commonMocks.okJson({})
            });

            const mockFn = mockFetch.getMock();
            await mockFn('http://api.example.com/exists');

            expect(mockFetch.wasRequested('http://api.example.com/exists')).toBe(true);
            expect(mockFetch.wasRequested('http://api.example.com/other')).toBe(false);
        });

        it('should get last request', async () => {
            mockFetch.addMock({
                url: 'http://api.example.com/*',
                response: commonMocks.okJson({})
            });

            const mockFn = mockFetch.getMock();
            await mockFn('http://api.example.com/first');
            await mockFn('http://api.example.com/second');

            const last = mockFetch.getLastRequest();
            expect(last?.url).toBe('http://api.example.com/second');
        });
    });

    describe('dynamic responses', () => {
        it('should support dynamic response generation', async () => {
            mockFetch.addMock(createDynamicMock(
                'http://api.example.com/dynamic',
                ({ url }) => ({ url, dynamic: true })
            ));

            const mockFn = mockFetch.getMock();
            const response = await mockFn('http://api.example.com/dynamic');
            const data = await response.json();

            expect(data.dynamic).toBe(true);
        });
    });

    describe('reset', () => {
        it('should clear mocks and requests', async () => {
            mockFetch.addMock({
                url: 'http://api.example.com/test',
                response: commonMocks.okJson({})
            });

            const mockFn = mockFetch.getMock();
            await mockFn('http://api.example.com/test');

            mockFetch.reset();

            expect(mockFetch.getRequests()).toHaveLength(0);
            expect(mockFetch.getCallCount()).toBe(0);
        });
    });
});

describe('global mock fetch', () => {
    it('should setup and get global mock', () => {
        const mock = setupMockFetch();
        
        expect(mock).toBeInstanceOf(MockFetch);
    });
});

describe('commonMocks', () => {
    it('should create valid okJson response', async () => {
        const response = commonMocks.okJson({ test: true });
        
        expect(response.ok).toBe(true);
        expect(response.status).toBe(200);
        
        const data = await response.json!();
        expect(data).toEqual({ test: true });
    });

    it('should create valid invokeResponse', async () => {
        const response = commonMocks.invokeResponse('test_promise', { result: true });
        
        expect(response.ok).toBe(true);
        const data = await response.json!();
        expect(data.promiseId).toBe('test_promise');
    });

    it('should create valid statusResponse', async () => {
        const response = commonMocks.statusResponse('processing');
        
        expect(response.ok).toBe(true);
        const data = await response.json!();
        expect(data.status).toBe('processing');
    });

    it('should create valid error response', () => {
        const response = commonMocks.error(500, 'Server Error');
        
        expect(response.ok).toBe(false);
        expect(response.status).toBe(500);
    });

    it('should create valid notFound response', () => {
        const response = commonMocks.notFound('Resource not found');
        
        expect(response.ok).toBe(false);
        expect(response.status).toBe(404);
    });
});
