/**
 * Tests for Simulation Replay Module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimulationReplay } from '../simulation-replay.js';

describe('SimulationReplay', () => {
    let replay;
    let mockClient;

    beforeEach(() => {
        // Create mock client
        mockClient = {
            request: vi.fn()
        };

        replay = new SimulationReplay({
            apiBase: '/api',
            projectId: 'test-project',
            client: mockClient
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should initialize with correct options', () => {
            expect(replay.apiBase).toBe('/api');
            expect(replay.projectId).toBe('test-project');
            expect(replay.client).toBe(mockClient);
            expect(replay.state.currentStep).toBe(0);
            expect(replay.state.history).toEqual([]);
        });

        it('should use default options when not provided', () => {
            const defaultReplay = new SimulationReplay();
            expect(defaultReplay.apiBase).toBe('/api');
            expect(defaultReplay.projectId).toBe('default');
            expect(defaultReplay.client).toBeDefined();
        });
    });

    describe('Event System', () => {
        it('should emit and listen to events', () => {
            const handler = vi.fn();
            replay.on('test', handler);
            replay._emit('test', { data: 1 });
            expect(handler).toHaveBeenCalledWith({ data: 1 });
        });

        it('should unsubscribe from events', () => {
            const handler = vi.fn();
            const unsubscribe = replay.on('test', handler);
            unsubscribe();
            replay._emit('test', { data: 1 });
            expect(handler).not.toHaveBeenCalled();
        });

        it('should emit loading event when loading simulation', async () => {
            const loadingHandler = vi.fn();
            replay.on('loading', loadingHandler);

            mockClient.request.mockResolvedValueOnce({
                id: 'test-sim',
                name: 'Test Simulation'
            });

            await replay.loadSimulation('test-sim');
            expect(loadingHandler).toHaveBeenCalledWith({ simulationId: 'test-sim' });
        });
    });

    describe('start()', () => {
        it('should start simulation and create session', async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' }) // Create session
                .mockResolvedValueOnce({
                    context: { session_id: 'session-123', version: '1.0' },
                    execute: { form: { choices: [{ id: 'choice1', label: 'Choice 1' }] } }
                }); // Send message

            const result = await replay.start('Test task');

            expect(mockClient.request).toHaveBeenCalledWith('POST', '/sessions', {
                project_id: 'test-project'
            });
            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/sessions/session-123/message',
                expect.any(Object)
            );
            expect(result.context.session_id).toBe('session-123');
            expect(replay.state.currentSessionId).toBe('session-123');
        });

        it('should throw error if simulation already running', async () => {
            replay.state.isExecuting = true;
            await expect(replay.start('Test task')).rejects.toThrow('Simulation already running');
        });

        it('should record step in history', async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({
                    context: { session_id: 'session-123' },
                    execute: { form: { choices: [] } }
                });

            await replay.start('Test task');

            expect(replay.state.history).toHaveLength(1);
            expect(replay.state.history[0].type).toBe('initial');
            expect(replay.state.history[0].request.task).toBe('Test task');
        });

        it('should emit started and step events', async () => {
            const startedHandler = vi.fn();
            const stepHandler = vi.fn();
            replay.on('started', startedHandler);
            replay.on('step', stepHandler);

            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } });

            await replay.start('Test task');

            expect(startedHandler).toHaveBeenCalledWith({ task: 'Test task' });
            expect(stepHandler).toHaveBeenCalledWith({ step: 0, result: expect.any(Object) });
        });
    });

    describe('sendFormChoice()', () => {
        beforeEach(async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({
                    context: { session_id: 'session-123' },
                    execute: { form: { choices: [] } }
                });
            await replay.start('Test task');
        });

        it('should send form choice', async () => {
            mockClient.request.mockResolvedValueOnce({
                context: { session_id: 'session-123' }
            });

            const result = await replay.sendFormChoice('choice1', { extra: 'data' });

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/sessions/session-123/message',
                expect.objectContaining({
                    result: expect.objectContaining({ choice: 'choice1', extra: 'data' })
                })
            );
        });

        it('should throw error if no active simulation', async () => {
            replay.state.isExecuting = false;
            await expect(replay.sendFormChoice('choice1')).rejects.toThrow('No active simulation');
        });

        it('should increment step counter', async () => {
            mockClient.request.mockResolvedValueOnce({ context: { session_id: 'session-123' } });

            await replay.sendFormChoice('choice1');

            expect(replay.state.currentStep).toBe(1);
        });
    });

    describe('sendMessage()', () => {
        beforeEach(async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } });
            await replay.start('Test task');
        });

        it('should send message', async () => {
            mockClient.request.mockResolvedValueOnce({
                context: { session_id: 'session-123' }
            });

            await replay.sendMessage('Hello AI');

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/sessions/session-123/message',
                expect.objectContaining({
                    result: expect.objectContaining({ message: 'Hello AI' })
                })
            );
        });
    });

    describe('sendActionResult()', () => {
        beforeEach(async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } });
            await replay.start('Test task');
        });

        it('should send action result with action-key shape', async () => {
            mockClient.request.mockResolvedValueOnce({
                context: { session_id: 'session-123' }
            });

            const actionResult = { path: 'test.txt', content: 'Hello' };
            await replay.sendActionResult('read-file', actionResult);

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/sessions/session-123/message',
                expect.objectContaining({
                    result: expect.objectContaining({ 'read-file': actionResult })
                })
            );
        });
    });

    describe('replayStep()', () => {
        it('should replay initial step with task', async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({
                    context: { session_id: 'session-123' },
                    execute: { form: { choices: [] } }
                });

            const stepData = {
                request: { new_task: ['Test task from step'] }
            };

            const result = await replay.replayStep(0, stepData);

            expect(mockClient.request).toHaveBeenCalledWith('POST', '/sessions', {
                project_id: 'test-project'
            });
            expect(result.context.session_id).toBe('session-123');
        });

        it('should replay form choice step', async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } });

            await replay.start('Test task');

            const stepData = {
                request: {
                    result: { choice: 'confirm_action', extra: 'data' }
                }
            };

            await replay.replayStep(1, stepData);

            expect(mockClient.request).toHaveBeenCalledWith(
                'POST',
                '/sessions/session-123/message',
                expect.objectContaining({
                    result: expect.objectContaining({ choice: 'confirm_action', extra: 'data' })
                })
            );
        });
    });

    describe('Completion Detection', () => {
        it('should detect completion when result.completed is true', async () => {
            const completeHandler = vi.fn();
            replay.on('completed', completeHandler);

            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({
                    context: { session_id: 'session-123' },
                    result: { completed: true }
                });

            await replay.start('Test task');

            expect(completeHandler).toHaveBeenCalled();
            expect(replay.state.isExecuting).toBe(false);
        });

        it('should detect completion when finalResult is present', async () => {
            const completeHandler = vi.fn();
            replay.on('completed', completeHandler);

            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({
                    context: { session_id: 'session-123' },
                    finalResult: { output: 'Done' }
                });

            await replay.start('Test task');

            expect(completeHandler).toHaveBeenCalled();
        });
    });

    describe('State Management', () => {
        it('should get history', async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } });

            await replay.start('Test task');

            const history = replay.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0].step).toBe(0);
        });

        it('should not allow external mutation of history', async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } });

            await replay.start('Test task');

            const history = replay.getHistory();
            history.push({ tampered: true });

            expect(replay.state.history).toHaveLength(1);
        });

        it('should reset state', async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } });

            await replay.start('Test task');
            replay.reset();

            expect(replay.state.currentStep).toBe(0);
            expect(replay.state.history).toEqual([]);
            expect(replay.state.currentSessionId).toBeNull();
        });

        it('should stop execution', async () => {
            mockClient.request
                .mockResolvedValueOnce({ session_id: 'session-123' })
                .mockResolvedValueOnce({ context: { session_id: 'session-123' } });

            await replay.start('Test task');
            replay.stop();

            expect(replay.state.isExecuting).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should emit error event on API failure', async () => {
            const errorHandler = vi.fn();
            replay.on('error', errorHandler);

            mockClient.request.mockRejectedValueOnce(new Error('API Error'));

            try {
                await replay.start('Test task');
            } catch (e) {
                // Expected
            }

            expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({
                type: 'start',
                error: expect.any(Error)
            }));
        });

        it('should throw error when session creation fails', async () => {
            mockClient.request.mockResolvedValueOnce({}); // No session_id

            await expect(replay.start('Test task')).rejects.toThrow();
        });
    });
});
