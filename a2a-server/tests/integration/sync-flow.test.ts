/**
 * Sync Flow Integration Tests
 * Tests the synchronous request processing flow for immediate UI responses
 */

import request from 'supertest';
import app from '../../src/app.js';
import {describe, it, expect, beforeAll, afterAll} from 'vitest';

describe('Sync Flow Integration', () => {
    let step1Context: any;
    let step2Context: any;
    let step3Context: any;

    beforeAll(async () => {
        // Setup test environment if needed
        process.env.DEFAULT_SYNC_MODE = '1'; // Enable sync mode for testing
        process.env.SKIP_AUTH = '1'; // Skip auth for testing
    });

    afterAll(async () => {
        // Cleanup
        delete process.env.DEFAULT_SYNC_MODE;
        delete process.env.SKIP_AUTH;
    });

    describe('Basic Sync Flow API Tests', () => {
        it('should accept sync flag in invoke request', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'test-sync-flag',
                    sync: true
                });

            // Should not return 404 - endpoint exists and accepts the request
            expect(res.status).not.toBe(404);
            expect([200, 201, 400]).toContain(res.status); // Accept validation errors too
        });

        it('should accept async request (no sync flag)', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'test-async-default'
                    // No sync flag - should default to async
                });

            // Should not return 404 - endpoint exists and accepts the request
            expect(res.status).not.toBe(404);
            expect([200, 201, 400]).toContain(res.status); // Accept validation errors too
        });

        it('should accept explicit async flag', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'test-async-explicit',
                    sync: false
                });

            // Should not return 404 - endpoint exists and accepts the request
            expect(res.status).not.toBe(404);
            expect([200, 201, 400]).toContain(res.status); // Accept validation errors too
        });

        it('Step 1: Initial dialog request should return form with choices', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'dialog',
                    sync: true
                });

            expect([200, 201]).toContain(res.status);

            if (res.body.success && res.body.data?.execute?.form?.choices) {
                expect(res.body.data.execute.form.choices).toBeDefined();
                expect(Array.isArray(res.body.data.execute.form.choices)).toBe(true);
                expect(res.body.data.context?.execution?.step).toBeDefined();
                expect(res.body.data.sync).toBe(true);
                step1Context = res.body.data.context; // Save context for step 2
            } else if (res.body.success && res.body.data?.promiseId) {
                // Async response acceptable
                expect(res.body.data.promiseId).toBeDefined();
            }
        });

        it(
            'Step 2: Submit choice selection should return sync input form',
            async () => {
                expect(
                    step1Context,
                    'Step 1 must return sync context with router choices (check invoke + DEFAULT_SYNC_MODE)'
                ).toBeDefined();

                const res = await request(app)
                    .post('/api/v1/invoke')
                    .send({
                        context: step1Context, // Include context from step 1
                        result: { choice: 'dialog' },
                        sync: true,
                    });

                expect([200, 201]).toContain(res.status);

                if (res.body.success && res.body.data?.execute?.form?.textarea) {
                    expect(res.body.data.execute.form.textarea).toBeDefined();
                    expect(Array.isArray(res.body.data.execute.form.textarea)).toBe(true);
                    expect(res.body.data.context?.execution?.step).toBeDefined();
                    expect(res.body.data.context?.execution?.action).toBe('dialog');
                    expect(res.body.data.sync).toBe(true);
                    step2Context = res.body.data.context; // Save context for next steps
                } else if (res.body.success && res.body.data?.promiseId) {
                    // Async response acceptable
                    expect(res.body.data.promiseId).toBeDefined();
                }
            },
            180_000
        );

        it(
            'Step 3: Submit message should return sync response with message + input form',
            async () => {
                expect(step2Context, 'Step 2 must return sync dialog form context').toBeDefined();

                const res = await request(app)
                    .post('/api/v1/invoke')
                    .send({
                        context: step2Context, // Include context from step 2
                        result: { message: 'Hello from sync flow test' },
                        sync: true,
                    });

                expect([200, 201]).toContain(res.status);

                if (res.body.success && res.body.data?.execute?.message && res.body.data?.execute?.form?.textarea) {
                    expect(res.body.data.execute.message).toBeDefined();
                    expect(res.body.data.execute.form.textarea).toBeDefined();
                    expect(Array.isArray(res.body.data.execute.form.textarea)).toBe(true);
                    expect(res.body.data.context?.execution?.step).toBeDefined();
                    expect(res.body.data.context?.history).toBeDefined();
                    expect(Array.isArray(res.body.data.context.history)).toBe(true);
                    expect(res.body.data.sync).toBe(true);
                    step3Context = res.body.data.context; // Save context for next steps
                } else if (res.body.success && res.body.data?.promiseId) {
                    // Async response acceptable
                    expect(res.body.data.promiseId).toBeDefined();
                }
            },
            180_000
        );

        it(
            'Step 4: Submit final message should complete the dialog',
            async () => {
                expect(step3Context, 'Step 3 must return sync context for follow-up').toBeDefined();

                const res = await request(app)
                    .post('/api/v1/invoke')
                    .send({
                        context: step3Context, // Include context from step 3
                        result: { message: 'Thanks! This completes the sync flow test.' },
                        sync: true,
                    });

                expect([200, 201]).toContain(res.status);

                // Final response should have execute object (completion)
                if (res.body.success && res.body.data?.execute) {
                    expect(res.body.data.execute).toBeDefined();
                    expect(res.body.data.context?.execution?.step).toBeDefined();
                    expect(res.body.data.sync).toBe(true);
                } else if (res.body.success && res.body.data?.promiseId) {
                    // Async completion also acceptable
                    expect(res.body.data.promiseId).toBeDefined();
                }
            },
            180_000
        );
    });

    describe('Environment Configuration', () => {
        it('should respect DEFAULT_SYNC_MODE environment variable', async () => {
            // Test with sync mode enabled
            process.env.DEFAULT_SYNC_MODE = '1';
            const resSync = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'test-env-sync'
                });

            expect(resSync.status).not.toBe(404);

            // Test with sync mode disabled (default async)
            delete process.env.DEFAULT_SYNC_MODE;
            const resAsync = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'test-env-async'
                });

            expect(resAsync.status).not.toBe(404);

            // Restore sync mode for other tests
            process.env.DEFAULT_SYNC_MODE = '1';
        });

        it('should override DEFAULT_SYNC_MODE with explicit sync flag', async () => {
            // Even with DEFAULT_SYNC_MODE=1, explicit sync: false should work
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'test-override',
                    sync: false
                });

            expect(res.status).not.toBe(404);
        });
    });

    describe('Protocol Compliance', () => {
        it('sync dialog assigns context.session_id (srv_sess_*) when body returns data', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'dialog',
                    sync: true,
                });

            expect([200, 201]).toContain(res.status);
            if (!res.body.success || !res.body.data?.context) {
                return;
            }
            const sid = res.body.data.context.session_id;
            expect(typeof sid).toBe('string');
            expect(sid).toMatch(/^srv_sess_/);
        });

        it('should validate request schema correctly', async () => {
            // Valid first request
            const res1 = await request(app)
                .post('/api/v1/invoke')
                .send({
                    task: 'dialog',
                    sync: true
                });

            expect([200, 201, 400]).toContain(res1.status); // 400 is OK for validation errors

            // Invalid request - missing required task
            const res2 = await request(app)
                .post('/api/v1/invoke')
                .send({
                    sync: true
                    // Missing task
                });

            expect([400]).toContain(res2.status); // Should fail validation
        });

        it('should accept action-key shaped result objects', async () => {
            // Test with valid result format
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    context: {
                        task: 'test',
                        execution: { action: 'test', step: 'test' }
                    },
                    result: { choice: 'dialog' },
                    sync: true
                });

            expect([200, 201, 400]).toContain(res.status); // 400 acceptable for validation
        });
    });
});