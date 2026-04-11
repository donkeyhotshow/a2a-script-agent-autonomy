/**
 * Integration Test without Mocks (Stateless)
 *
 * Uses an isolated REQUESTS_STORAGE_PATH so tests are fast and do not scan dev storage/requests.
 */

import {describe, it, expect, beforeAll, afterAll, beforeEach, vi} from 'vitest';
import * as path from 'path';
import * as os from 'os';
import {mkdirSync, rmSync} from 'fs';
import {messageService} from '../../src/services/core/messaging/message.service';

let requestService: typeof import('../../../../request/src/request.service')['requestService'];

let tmpReqDir: string;

describe('Integration Tests (Real Components - Stateless)', () => {
    beforeAll(async () => {
        tmpReqDir = path.join(os.tmpdir(), `a2a-req-it-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        mkdirSync(tmpReqDir, {recursive: true});
        process.env.REQUESTS_STORAGE_PATH = tmpReqDir;
        vi.resetModules();
        const mod = await import('../../../../request/src/request.service');
        requestService = mod.requestService;
    });

    afterAll(() => {
        try {
            rmSync(tmpReqDir, {recursive: true, force: true});
        } catch {
            /* ignore */
        }
        delete process.env.REQUESTS_STORAGE_PATH;
    });

    beforeEach(() => {
        // State is reset between tests (in-memory only)
    });

    describe('Request Service Integration', () => {
        it('should create and retrieve request', async () => {
            const {promiseId, id} = await requestService.create({
                clientId: 'test-client',
                context: {test: true},
                message: 'Test message',
            });

            expect(promiseId).toBeDefined();
            expect(id).toBeDefined();

            const result = await requestService.getResult(promiseId);
            expect(result).toBeDefined();
            expect(result?.clientId).toBe('test-client');
        });

        it('should update request status', async () => {
            const {promiseId} = await requestService.create({
                clientId: 'test-client',
                context: {},
            });

            const updated = await requestService.updateStatus(promiseId, 'processing');
            expect(updated).toBe(true);

            const status = await requestService.getStatus(promiseId);
            expect(status?.status).toBe('processing');
        });

        it('should complete request with result', async () => {
            const {promiseId} = await requestService.create({
                clientId: 'test-client',
                context: {},
            });

            await requestService.updateStatus(promiseId, 'processing');
            const updated = await requestService.updateStatus(promiseId, 'completed', {
                output: 'success',
            });

            expect(updated).toBe(true);

            const result = await requestService.getResult(promiseId);
            expect(result?.status).toBe('completed');
            expect(result?.result).toEqual({output: 'success'});
        });

        it('should cancel pending request', async () => {
            const {promiseId} = await requestService.create({
                clientId: 'test-client',
                context: {},
            });

            const cancelled = await requestService.cancel(promiseId);
            expect(cancelled).toBe(true);

            const status = await requestService.getStatus(promiseId);
            expect(status?.status).toBe('cancelled');
        });

        it('should get next pending request', async () => {
            await requestService.cancelAllPending();

            await requestService.create({
                clientId: 'client-1',
                context: {},
                priority: 1,
            });

            await requestService.create({
                clientId: 'client-2',
                context: {},
                priority: 2,
            });

            const next = await requestService.getNextPending();
            expect(next).toBeDefined();
            expect(next?.priority).toBe(2);
        });

        it('should get queue length', async () => {
            await requestService.cancelAllPending();

            const initial = await requestService.getQueueLength();

            await requestService.create({
                clientId: 'client-1',
                context: {},
            });

            await requestService.create({
                clientId: 'client-2',
                context: {},
            });

            const length = await requestService.getQueueLength();
            expect(length).toBe(initial + 2);
        });
    });

    describe('Message Service Integration', () => {
        it('should create and retrieve message', async () => {
            const msg = await messageService.create({
                sessionId: 'session-1',
                direction: 'CLIENT_TO_SERVER',
                content: {text: 'Hello'},
            });

            expect(msg.id).toBeDefined();
            expect(msg.sessionId).toBe('session-1');

            const found = await messageService.findById(msg.id);
            expect(found?.id).toBe(msg.id);
        });

        it('should find messages by session', async () => {
            await messageService.create({
                sessionId: 'session-messages',
                direction: 'CLIENT_TO_SERVER',
                content: {text: 'Msg 1'},
            });

            await messageService.create({
                sessionId: 'session-messages',
                direction: 'SERVER_TO_CLIENT',
                content: {text: 'Msg 2'},
            });

            const messages = await messageService.findBySessionId('session-messages');
            expect(messages).toHaveLength(2);
        });

        it('should update message', async () => {
            const msg = await messageService.create({
                sessionId: 'session-1',
                direction: 'CLIENT_TO_SERVER',
                content: {text: 'Original'},
                status: 'pending',
            });

            const updated = await messageService.update(msg.id, {
                status: 'completed',
                content: {text: 'Updated'},
            });

            expect(updated?.status).toBe('completed');
            expect(updated?.content).toEqual({text: 'Updated'});
        });

        it('should delete message', async () => {
            const msg = await messageService.create({
                sessionId: 'session-1',
                direction: 'CLIENT_TO_SERVER',
                content: {text: 'To delete'},
            });

            await messageService.delete(msg.id);

            const found = await messageService.findById(msg.id);
            expect(found).toBeNull();
        });
    });

    describe('Request and Message Integration', () => {
        it('should link message to request via promiseId', async () => {
            const {promiseId} = await requestService.create({
                clientId: 'test-client',
                context: {},
            });

            const msg = await messageService.create({
                sessionId: 'session-1',
                direction: 'SERVER_TO_CLIENT',
                content: {text: 'Response'},
                promiseId,
            });

            const found = await messageService.findByPromiseId(promiseId);
            expect(found?.id).toBe(msg.id);
        });
    });
});
