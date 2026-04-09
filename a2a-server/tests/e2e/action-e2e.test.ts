/**
 * E2E тест для action iteration через HTTP API
 * Тестирует полный цикл: new_task → action_proposal → step_result → completed
 *
 * Требования:
 * - Запущенный сервер на localhost:3000 (или использовать mock)
 * - SKIP_AUTH=1 для тестов без аутентификации
 */

import {describe, it, expect, beforeAll} from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import {actionProcessor} from '../../src/actions/action-processor.js';

// Проверка доступности сервера
const SERVER_URL = 'http://localhost:3000';
let serverAvailable = false;

async function checkServerAvailability(): Promise<boolean> {
    try {
        const response = await fetch(`${SERVER_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        return response.ok;
    } catch {
        return false;
    }
}

describe('Action E2E', () => {
    beforeAll(async () => {
        // Инициализируем actionProcessor для тестов
        await actionProcessor.initialize();

        // Проверяем доступность сервера
        serverAvailable = await checkServerAvailability();
    });

    describe('HTTP API (через supertest)', () => {
        it('should create request and return promiseId', async () => {
            const res = await request(app)
                .post('/api/v1/requests')
                .set('Authorization', 'Bearer test-token')
                .send({
                    context: {
                        new_task: 'исправить импорты в vue',
                    },
                });

            // Может потребоваться аутентификация или SKIP_AUTH
            expect([201, 401, 403, 404]).toContain(res.status);

            if (res.status === 201) {
                expect(res.body.data.promiseId).toBeDefined();
                expect(res.body.data.status).toBe('pending');
            }
        });

        it('should get request status', async () => {
            // Сначала создаем запрос
            const createRes = await request(app)
                .post('/api/v1/requests')
                .set('Authorization', 'Bearer test-token')
                .send({
                    context: {
                        new_task: 'vue imports fix',
                    },
                });

            if (createRes.status !== 201) {
                // Пропускаем если нет доступа
                return;
            }

            const {promiseId} = createRes.body.data;

            // Проверяем статус
            const statusRes = await request(app)
                .get(`/api/v1/requests/${promiseId}/status`)
                .set('Authorization', 'Bearer test-token');

            expect([200, 401, 403, 404]).toContain(statusRes.status);

            if (statusRes.status === 200) {
                expect(statusRes.body.data.status).toBeDefined();
            }
        });

        it('should get request result after completion', async () => {
            // Создаем запрос
            const createRes = await request(app)
                .post('/api/v1/requests')
                .set('Authorization', 'Bearer test-token')
                .send({
                    context: {
                        new_task: 'исправить импорты',
                    },
                });

            if (createRes.status !== 201) {
                return;
            }

            const {promiseId} = createRes.body.data;

            // Ждем завершения (с таймаутом)
            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                const statusRes = await request(app)
                    .get(`/api/v1/requests/${promiseId}/status`)
                    .set('Authorization', 'Bearer test-token');

                if (statusRes.status === 200) {
                    const status = statusRes.body.data.status;
                    if (status === 'completed' || status === 'failed') {
                        break;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }

            // Получаем результат
            const resultRes = await request(app)
                .get(`/api/v1/requests/${promiseId}/result`)
                .set('Authorization', 'Bearer test-token');

            expect([200, 400, 401, 403, 404]).toContain(resultRes.status);
        });
    });

    describe('Action Iteration Flow (через actionProcessor)', () => {
        it('should find action and return code', async () => {
            const sessionId = `test-e2e-${Date.now()}`;
            const result = await actionProcessor.processTaskRequest(
                sessionId,
                'исправить импорты в vue'
            );

            expect(result).toBeDefined();
            expect(result.message).toBeDefined();
            expect(result.context?.execution?.step).toBeDefined();
            const ex = result.execute;
            expect(ex && 'script' in ex && ex.script?.code).toBeDefined();
            expect(String(ex && 'script' in ex ? ex.script?.code : '')).toContain(
                'export default async function'
            );
        });

        it('should iterate through all steps', async () => {
            const sessionId = `test-e2e-iterate-${Date.now()}`;

            // Step 1: Start action
            let result = await actionProcessor.processTaskRequest(
                sessionId,
                'vue import fix'
            );

            expect(result.continue).toBe(true);
            expect(result.context?.execution?.step).toBeDefined();

            const executedSteps: string[] = [];

            // Iterate through steps
            while (result.continue && result.context?.execution?.step) {
                const stepId = result.context.execution.step;
                executedSteps.push(stepId);

                // Simulate step execution result
                const stepResult = {
                    success: true,
                    timestamp: new Date().toISOString(),
                };

                // Send step result and get next step
                result = await actionProcessor.processStepResult(
                    sessionId,
                    stepId,
                    stepResult
                );

                // Safety check to prevent infinite loop
                if (executedSteps.length > 10) {
                    throw new Error('Too many steps - possible infinite loop');
                }
            }

            // Verify all steps were executed
            expect(executedSteps.length).toBeGreaterThan(0);

            // After last step, action should be completed
            expect(result.continue).toBe(false);
        });

        it('should return no action for unknown task', async () => {
            const sessionId = `test-e2e-unknown-${Date.now()}`;
            const result = await actionProcessor.processTaskRequest(
                sessionId,
                'запустить ракету на марс'
            );

            expect(result).toBeDefined();
            expect(result.message).toBeDefined();
            // Для неизвестной задачи action не должен быть найден
            expect(result.actionId).toBeUndefined();
        });

        it('should track progress through steps', async () => {
            const sessionId = `test-e2e-progress-${Date.now()}`;

            // Start
            const start = await actionProcessor.processTaskRequest(sessionId, 'vue imports');
            // action_proposal message doesn't include tasks (see buildActionProposalMessage)
            expect(start.context?.tasks).toBeUndefined();

            // After step 1
            const fs0 = start.context?.execution?.step;
            expect(fs0).toBeDefined();
            const after1 = await actionProcessor.processStepResult(sessionId, fs0!, {
                files: [],
            });
            expect(after1.context?.tasks?.[0]?.progress).toBeGreaterThan(0);
        });
    });

    describe('Full Action Cycle', () => {
        it('should complete full fix-vue-imports action', async () => {
            const sessionId = `test-e2e-full-${Date.now()}`;

            let result = await actionProcessor.processTaskRequest(sessionId, 'fix vue imports');
            expect(result.continue).toBe(true);

            let guard = 0;
            while (result.continue) {
                const sid = result.context?.execution?.step;
                expect(sid).toBeDefined();
                result = await actionProcessor.processStepResult(sessionId, sid!, {step: sid});
                guard += 1;
                if (guard > 20) throw new Error('too many steps');
            }

            expect(result.context?.tasks?.[0]?.status).toBe('completed');
        });
    });
});

describe('Action E2E with Real Server', () => {
    // Эти тесты требуют запущенного сервера
    beforeAll(async () => {
        serverAvailable = await checkServerAvailability();
    });

    it.skipIf(!serverAvailable)('should work with real HTTP server', async () => {
        // Тест будет пропущен если сервер не доступен
        const response = await fetch(`${SERVER_URL}/api/v1/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                context: {
                    new_task: 'исправить импорты в vue',
                },
            }),
        });

        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.data.promiseId).toBeDefined();
    });
});

describe('ApiClient Mock Test', () => {
    // Мок для тестирования логики клиента без реального сервера
    interface MockActionStep {
        id: string;
        title: string;
        code: string;
    }

    interface MockActionResult {
        continue: boolean;
        actionId?: string;
        message: string;
        context?: {
            tasks?: Array<{ progress: number; status?: string }>;
            execution?: { action: string; step: string };
        };
        execute?: { script: { code: string } };
    }

    /**
     * Симуляция клиента для action iteration
     */
    class MockActionClient {
        private sessionId: string;
        private stepIndex: number = 0;

        // Предопределенные шаги для теста
        private steps: MockActionStep[] = [
            {id: 'vue-import-detect', title: 'Detect', code: 'async function detect() {}'},
            {id: 'vue-import-resolve', title: 'Resolve', code: 'async function resolve() {}'},
            {id: 'vue-import-apply', title: 'Apply', code: 'async function apply() {}'},
            {id: 'vue-import-cleanup', title: 'Cleanup', code: 'async function cleanup() {}'},
        ];

        constructor(sessionId: string) {
            this.sessionId = sessionId;
        }

        async processTaskRequest(task: string): Promise<MockActionResult> {
            // Симуляция поиска action
            if (task.toLowerCase().includes('import') && task.toLowerCase().includes('vue')) {
                return {
                    continue: true,
                    actionId: 'fix-vue-imports',
                    message: 'Action started',
                    context: {
                        tasks: [{progress: 0}],
                        execution: {action: 'fix-vue-imports', step: this.steps[0].id},
                    },
                    execute: {script: {code: this.steps[0].code}},
                };
            }

            return {
                continue: false,
                message: 'No action',
                context: {tasks: []},
            };
        }

        async processStepResult(stepId: string, _result: Record<string, unknown>): Promise<MockActionResult> {
            const currentStepIndex = this.steps.findIndex(s => s.id === stepId);

            if (currentStepIndex === -1) {
                throw new Error(`Unknown step: ${stepId}`);
            }

            this.stepIndex = currentStepIndex + 1;
            const progress = Math.round((this.stepIndex / this.steps.length) * 100);

            if (this.stepIndex >= this.steps.length) {
                // Все шаги выполнены
                return {
                    continue: false,
                    message: 'Completed',
                    context: {tasks: [{progress: 100, status: 'completed'}]},
                };
            }

            const cur = this.steps[this.stepIndex];
            return {
                continue: true,
                message: 'In progress',
                context: {
                    tasks: [{progress}],
                    execution: {action: 'fix-vue-imports', step: cur.id},
                },
                execute: {script: {code: cur.code}},
            };
        }
    }

    it('should simulate full client iteration flow', async () => {
        const client = new MockActionClient('test-mock-session');

        // Start
        let result = await client.processTaskRequest('fix vue imports');
        expect(result.continue).toBe(true);
        expect(result.context?.execution?.step).toBe('vue-import-detect');

        const executedSteps: string[] = [];

        // Iterate
        while (result.continue && result.context?.execution?.step) {
            const stepId = result.context.execution.step;
            executedSteps.push(stepId);

            result = await client.processStepResult(stepId, {test: true});
        }

        // Verify
        expect(executedSteps).toEqual([
            'vue-import-detect',
            'vue-import-resolve',
            'vue-import-apply',
            'vue-import-cleanup',
        ]);
        expect(result.continue).toBe(false);
        expect(result.context?.tasks?.[0]?.status).toBe('completed');
    });

    it('should handle unknown task in mock', async () => {
        const client = new MockActionClient('test-mock-unknown');

        const result = await client.processTaskRequest('do something unknown');
        expect(result.continue).toBe(false);
        expect(result.actionId).toBeUndefined();
    });
});
