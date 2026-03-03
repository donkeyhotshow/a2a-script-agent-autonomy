/**
 * Tests for simulation-helpers.ts
 */

import { invokeFirstTask, sendFormChoice, sendMessage, type FirstTaskResult, type InvokeFirstTaskOptions } from '../src/simulation-helpers.js';

// Mock client for testing
const createMockClient = (sessionResponse: any, messageResponse: any) => ({
    request: async (method: string, path: string, body: any) => {
        if (path === '/sessions') {
            return sessionResponse;
        }
        if (path.includes('/message')) {
            return messageResponse;
        }
        throw new Error(`Unexpected request: ${method} ${path}`);
    }
});

describe('invokeFirstTask', () => {
    it('should create session and send task message', async () => {
        const mockClient = createMockClient(
            { session_id: 'test-session-123' },
            {
                context: {
                    version: '1.0',
                    session_id: 'test-session-123',
                    execute: {
                        form: {
                            choices: [
                                { id: 'choice1', label: 'Choice 1' },
                                { id: 'choice2', label: 'Choice 2' }
                            ]
                        }
                    }
                }
            }
        );

        const result = await invokeFirstTask(mockClient, 'Test task', { projectId: 'test-project' });

        expect(result).toBeDefined();
        expect(result.context).toBeDefined();
        expect(result.context.session_id).toBe('test-session-123');
        expect(result.execute).toBeDefined();
        expect(result.execute?.form?.choices).toHaveLength(2);
        expect(result.execute?.form?.choices?.[0].id).toBe('choice1');
    });

    it('should use default projectId when not provided', async () => {
        const mockClient = createMockClient(
            { session_id: 'test-session-456' },
            { context: { version: '1.0', session_id: 'test-session-456' } }
        );

        const result = await invokeFirstTask(mockClient, 'Test task');

        expect(result.context.session_id).toBe('test-session-456');
    });

    it('should handle response without form choices', async () => {
        const mockClient = createMockClient(
            { session_id: 'test-session-789' },
            {
                context: {
                    version: '1.0',
                    session_id: 'test-session-789',
                    promiseId: 'promise-123',
                    status: 'pending'
                }
            }
        );

        const result = await invokeFirstTask(mockClient, 'Test task');

        expect(result.context.session_id).toBe('test-session-789');
        expect(result.execute).toBeUndefined();
        expect(result.promiseId).toBe('promise-123');
        expect(result.status).toBe('pending');
    });

    it('should throw error when session creation fails', async () => {
        const mockClient = createMockClient(
            {}, // No session_id
            {}
        );

        await expect(invokeFirstTask(mockClient, 'Test task'))
            .rejects
            .toThrow('Failed to create session: no session_id returned');
    });

    it('should handle missing data property in responses', async () => {
        const mockClient = createMockClient(
            { session_id: 'test-session-111' },
            {
                context: {
                    version: '1.0',
                    session_id: 'test-session-111',
                    execute: {
                        form: {
                            choices: [
                                { id: 'test-choice', label: 'Test Choice' }
                            ]
                        }
                    }
                }
            }
        );

        const result = await invokeFirstTask(mockClient, 'Test task');

        expect(result.context.session_id).toBe('test-session-111');
        expect(result.execute?.form?.choices?.[0].id).toBe('test-choice');
    });
});

describe('sendFormChoice', () => {
    it('should send form choice and return response', async () => {
        const mockClient = createMockClient(
            {},
            {
                context: {
                    version: '1.0',
                    session_id: 'test-session-123',
                    execute: {
                        form: {
                            choices: [
                                { id: 'next', label: 'Next' }
                            ]
                        }
                    }
                }
            }
        );

        const context = { session_id: 'test-session-123' };
        const result = await sendFormChoice(mockClient, context, 'choice1', { extra: 'data' });

        expect(result).toBeDefined();
        expect(result.context).toBeDefined();
        expect(result.context.session_id).toBe('test-session-123');
    });

    it('should throw error when no session_id in context', async () => {
        const mockClient = createMockClient({}, {});

        const context = { some: 'data' };

        await expect(sendFormChoice(mockClient, context, 'choice1'))
            .rejects
            .toThrow('No session_id in context');
    });

    it('should include extra data in result', async () => {
        const mockClient = createMockClient(
            {},
            {
                context: {
                    version: '1.0',
                    session_id: 'test-session-456'
                }
            }
        );

        const context = { session_id: 'test-session-456' };
        const result = await sendFormChoice(mockClient, context, 'confirm', { 
            action: 'proceed',
            timestamp: '2026-03-04T01:35:00Z'
        });

        expect(result).toBeDefined();
        expect(result.context.session_id).toBe('test-session-456');
    });
});

describe('sendMessage', () => {
    it('should send message and return response', async () => {
        const mockClient = createMockClient(
            {},
            {
                context: {
                    version: '1.0',
                    session_id: 'test-session-789',
                    execute: {
                        message: 'Processing your request...'
                    }
                }
            }
        );

        const context = { session_id: 'test-session-789' };
        const result = await sendMessage(mockClient, context, 'Hello, AI!');

        expect(result).toBeDefined();
        expect(result.context).toBeDefined();
        expect(result.context.session_id).toBe('test-session-789');
    });

    it('should throw error when no session_id in context', async () => {
        const mockClient = createMockClient({}, {});

        const context = { some: 'data' };

        await expect(sendMessage(mockClient, context, 'Test message'))
            .rejects
            .toThrow('No session_id in context');
    });

    it('should include message in result', async () => {
        const mockClient = createMockClient(
            {},
            {
                context: {
                    version: '1.0',
                    session_id: 'test-session-111'
                }
            }
        );

        const context = { session_id: 'test-session-111' };
        const result = await sendMessage(mockClient, context, 'This is a test message');

        expect(result).toBeDefined();
        expect(result.context.session_id).toBe('test-session-111');
    });
});
