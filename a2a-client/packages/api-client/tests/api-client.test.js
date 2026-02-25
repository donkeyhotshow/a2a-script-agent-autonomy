/**
 * API Client Unit Tests
 * Tests for @a2a/api-client package
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient, ApiError } from '../src/index.js';

// Mock node-fetch
vi.mock('node-fetch', () => ({
  default: vi.fn(),
}));

describe('@a2a/api-client', () => {
  
  describe('ApiClient', () => {
    describe('constructor', () => {
      it('should create client with default server URL', () => {
        const client = new ApiClient({});
        expect(client.serverUrl).toBe('http://localhost:3000/api/v1');
      });

      it('should accept custom server URL', () => {
        const client = new ApiClient({ serverUrl: 'http://test/api/v1/' });
        expect(client.serverUrl).toBe('http://test/api/v1');
      });

      it('should set default timeout of 30s', () => {
        const client = new ApiClient({});
        expect(client.timeout).toBe(30000);
      });

      it('should accept custom timeout', () => {
        const client = new ApiClient({ timeout: 5000 });
        expect(client.timeout).toBe(5000);
      });

      it('should set token and clientId', () => {
        const client = new ApiClient({ 
          token: 'test-token', 
          clientId: 'test-client' 
        });
        expect(client.token).toBe('test-token');
        expect(client.clientId).toBe('test-client');
      });

      it('should handle undefined config', () => {
        const client = new ApiClient(undefined);
        expect(client.serverUrl).toBe('http://localhost:3000/api/v1');
        expect(client.timeout).toBe(30000);
      });
    });

    describe('request()', () => {
      it('should make GET request - STUB', () => {
        // TODO: Implement test
        expect(true).toBe(true);
      });

      it('should make POST request with body - STUB', () => {
        // TODO: Implement test
        expect(true).toBe(true);
      });

      it('should include auth token in headers - STUB', () => {
        // TODO: Implement test
        expect(true).toBe(true);
      });

      it('should throw ApiError on non-ok response - STUB', () => {
        // TODO: Implement test
        expect(true).toBe(true);
      });

      it('should throw ApiError on timeout - STUB', () => {
        // TODO: Implement test
        expect(true).toBe(true);
      });
    });

    describe('createSession()', () => {
      it('should create session via POST /sessions - STUB', () => {
        // TODO: Implement test
        expect(true).toBe(true);
      });

      it('should return session data - STUB', () => {
        // TODO: Implement test
        expect(true).toBe(true);
      });
    });

    describe('sendMessage()', () => {
      it('should send message to session - STUB', () => {
        // TODO: Implement test
        // Should POST to /sessions/{id}/message
        expect(true).toBe(true);
      });

      it('should include new_task in body - STUB', () => {
        // TODO: Implement test
        expect(true).toBe(true);
      });
    });

    describe('continueSession()', () => {
      it('should continue session - STUB', () => {
        // TODO: Implement test
        // Should POST to /sessions/{id}/continue
        expect(true).toBe(true);
      });
    });

    describe('confirmSession()', () => {
      it('should confirm session with files - STUB', () => {
        // TODO: Implement test
        // Should POST to /sessions/{id}/confirm
        expect(true).toBe(true);
      });
    });

    describe('invoke()', () => {
      it('should invoke action - STUB', () => {
        // TODO: Implement test
        // Should POST to /invoke
        expect(true).toBe(true);
      });
    });
  });

  describe('ApiError', () => {
    it('should create error with message', () => {
      const error = new ApiError('Test error', 500);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('ApiError');
    });

    it('should include status code', () => {
      const error = new ApiError('Not found', 404);
      expect(error.status).toBe(404);
    });

    it('should include data', () => {
      const error = new ApiError('Error', 400, { code: 'INVALID_REQUEST' });
      expect(error.data).toEqual({ code: 'INVALID_REQUEST' });
    });

    it('should have default empty data', () => {
      const error = new ApiError('Error', 500);
      expect(error.data).toEqual({});
    });
  });
});
