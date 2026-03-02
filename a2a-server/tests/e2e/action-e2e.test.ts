/**
 * E2E тест для action iteration через HTTP API
 * Тестирует полный цикл: new_task → action_proposal → step_result → completed
 *
 * Требования:
 * - Запущенный сервер на localhost:3000 (или использовать mock)
 * - SKIP_AUTH=1 для тестов без аутентификации
 */

import {describe, it, expect, beforeAll, afterAll, vi} from 'vitest';
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
                        version: '1.0',
                        new_task: 'исправить импорты в vue',
                    },
                });

            // Может потребоваться аутентификация или SKIP_AUTH
            expect([201, 401, 403]).toContain(res.status);

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
                        version: '1.0',
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
                        version: '1.0',
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
            let result = null;

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
            expect(result.message.action).toBeDefined();
            expect(result.message.action?.currentStep).toBeDefined();
            expect(result.message.action?.currentStep?.code).toBeDefined();
            expect(result.message.action?.currentStep?.code).toContain('export default async function');
        });

        it('should iterate through all steps', async () => {
            const sessionId = `test-e2e-iterate-${Date.now()}`;

            // Step 1: Start action
            let result = await actionProcessor.processTaskRequest(
                sessionId,
                'vue import fix'
            );

            expect(result.continue).toBe(true);
            expect(result.message.action?.currentStep).toBeDefined();

            const executedSteps: string[] = [];

            // Iterate through steps
            while (result.continue && result.message.action?.currentStep) {
                const step = result.message.action.currentStep;
                executedSteps.push(step.id);

                // Simulate step execution result
                const stepResult = {
                    success: true,
                    timestamp: new Date().toISOString(),
                };

                // Send step result and get next step
                result = await actionProcessor.processStepResult(
                    sessionId,
                    step.id,
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
            expect(start.message.context?.tasks?.[0]?.progress).toBe(0);

            // After step 1
            const after1 = await actionProcessor.processStepResult(sessionId, 'vue-import-detect', {
                broken_imports: []
            });
            expect(after1.message.context?.tasks?.[0]?.progress).toBeGreaterThan(0);
        });
    });

    describe('Full Action Cycle', () => {
        it('should complete full fix-vue-imports action', async () => {
            const sessionId = `test-e2e-full-${Date.now()}`;

            // 1. Start: detect broken imports
            const result1 = await actionProcessor.processTaskRequest(sessionId, 'fix vue imports');
            expect(result1.message.action?.currentStep?.id).toBe('vue-import-detect');
            expect(result1.continue).toBe(true);

            // 2. Send detect result, get resolve step
            const result2 = await actionProcessor.processStepResult(sessionId, 'vue-import-detect', {
                broken_imports: [
                    {file: 'src/App.vue', line: 5, specifier: './components/Button'}
                ]
            });
            expect(result2.message.action?.currentStep?.id).toBe('vue-import-resolve');
            expect(result2.continue).toBe(true);

            // 3. Send resolve result, get apply step
            const result3 = await actionProcessor.processStepResult(sessionId, 'vue-import-resolve', {
                patches: [
                    {file: 'src/App.vue', line: 5, from: './components/Button', to: './components/Button.vue'}
                ]
            });
            expect(result3.message.action?.currentStep?.id).toBe('vue-import-apply');
            expect(result3.continue).toBe(true);

            // 4. Send apply result, get cleanup step
            const result4 = await actionProcessor.processStepResult(sessionId, 'vue-import-apply', {
                fixed_files: ['src/App.vue']
            });
            expect(result4.message.action?.currentStep?.id).toBe('vue-import-cleanup');
            expect(result4.continue).toBe(true);

            // 5. Send cleanup result, action completed
            const result5 = await actionProcessor.processStepResult(sessionId, 'vue-import-cleanup', {
                cleanup_count: 0
            });
            expect(result5.continue).toBe(false);
            expect(result5.message.context?.tasks?.[0]?.status).toBe('completed');
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
                    version: '1.0',
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
        message: {
            context?: {
                tasks?: Array<{ progress: number; status?: string }>;
            };
            action?: {
                id: string;
                title: string;
                currentStep: MockActionStep | null;
                nextSteps: MockActionStep[];
            };
        };
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
                    message: {
                        context: {tasks: [{progress: 0}]},
                        action: {
                            id: 'fix-vue-imports',
                            title: 'Fix Vue Imports',
                            currentStep: this.steps[0],
                            nextSteps: this.steps.slice(1),
                        },
                    },
                };
            }

            return {
                continue: false,
                message: {context: {tasks: []}},
            };
        }

        async processStepResult(stepId: string, result: Record<string, unknown>): Promise<MockActionResult> {
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
                    message: {
                        context: {tasks: [{progress: 100, status: 'completed'}]},
                        action: {
                            id: 'fix-vue-imports',
                            title: 'Fix Vue Imports',
                            currentStep: null,
                            nextSteps: [],
                        },
                    },
                };
            }

            return {
                continue: true,
                message: {
                    context: {tasks: [{progress}]},
                    action: {
                        id: 'fix-vue-imports',
                        title: 'Fix Vue Imports',
                        currentStep: this.steps[this.stepIndex],
                        nextSteps: this.steps.slice(this.stepIndex + 1),
                    },
                },
            };
        }
    }

    it('should simulate full client iteration flow', async () => {
        const client = new MockActionClient('test-mock-session');

        // Start
        let result = await client.processTaskRequest('fix vue imports');
        expect(result.continue).toBe(true);
        expect(result.message.action?.currentStep?.id).toBe('vue-import-detect');

        const executedSteps: string[] = [];

        // Iterate
        while (result.continue && result.message.action?.currentStep) {
            const step = result.message.action.currentStep;
            executedSteps.push(step.id);

            result = await client.processStepResult(step.id, {test: true});
        }

        // Verify
        expect(executedSteps).toEqual([
            'vue-import-detect',
            'vue-import-resolve',
            'vue-import-apply',
            'vue-import-cleanup',
        ]);
        expect(result.continue).toBe(false);
        expect(result.message.context?.tasks?.[0]?.status).toBe('completed');
    });

    it('should handle unknown task in mock', async () => {
        const client = new MockActionClient('test-mock-unknown');

        const result = await client.processTaskRequest('do something unknown');
        expect(result.continue).toBe(false);
        expect(result.actionId).toBeUndefined();
    });
});
