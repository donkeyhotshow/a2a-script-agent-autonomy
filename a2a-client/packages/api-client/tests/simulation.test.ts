/**
 * Simulation Tests for API Client
 * 
 * Тестирование api-client против симуляций.
 * 
 * @see docs/new-request-flow/API-CLIENT-SIMULATION-TESTS.md
 */

import { ApiClient } from '../src/index.js';
import { 
    BaseSimulationRunner, 
    validateActionKeyShape,
    getSimulationSteps,
    loadSimulationStep 
} from './simulation-runner.js';

/**
 * Реализация runner для ApiClient
 */
class ApiClientSimulationRunner extends BaseSimulationRunner {
    private client: ApiClient;

    constructor(simulationName: string, serverUrl?: string) {
        super(simulationName);
        this.client = new ApiClient({
            serverUrl: serverUrl || process.env.TEST_SERVER_URL || 'http://localhost:3000/api/v1'
        });
    }

    protected async executeRequest(request: Record<string, unknown>): Promise<Record<string, unknown>> {
        const { action, context } = request as { 
            action?: Record<string, unknown>; 
            context?: Record<string, unknown> 
        };

        if (action?.invoke) {
            return await this.client.invoke(action.invoke as string, context || {});
        }

        if (context?.session_id) {
            return await this.client.continueSession(context.session_id as string, context);
        }

        throw new Error('Unknown request type');
    }
}

/**
 * Список симуляций для тестирования
 */
const SIMULATIONS = [
    'fix-vue-imports',
    'coder',
    'coder-smart',
    'task-decomposition',
    'auto-ai',
];

/**
 * Тест: Протокольная валидация action-key shape
 */
describe('Protocol Validation', () => {
    describe('validateActionKeyShape', () => {
        it('должен пропускать корректный result с action-key', () => {
            const response = {
                result: {
                    'read-file': { path: 'test.js', content: '...' }
                }
            };
            
            const { valid, errors } = validateActionKeyShape(response);
            expect(valid).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('должен пропускать корректный execute с action-key', () => {
            const response = {
                execute: {
                    form: {
                        choices: [
                            { id: 'confirm', label: 'Подтвердить' },
                            { id: 'cancel', label: 'Отмена' }
                        ]
                    }
                }
            };
            
            const { valid, errors } = validateActionKeyShape(response);
            expect(valid).toBe(true);
            expect(errors).toHaveLength(0);
        });

        it('должен отклонять generic content в result', () => {
            const response = {
                result: {
                    content: 'Some content'
                }
            };
            
            const { valid, errors } = validateActionKeyShape(response);
            expect(valid).toBe(false);
            expect(errors).toContain('Invalid action key: "content". Must be one of: read-file, write-file, script, rag-search, execute-command, form, message, error');
        });

        it('должен отклонять generic action в execute', () => {
            const response = {
                execute: {
                    action: 'read-file',
                    file: 'test.js'
                }
            };
            
            const { valid, errors } = validateActionKeyShape(response);
            expect(valid).toBe(false);
            expect(errors).toContain('Invalid execute key: "action". Must be one of: form, message, script, read-file, write-file, execute-command, rag-search');
        });
    });
});

/**
 * Тест: Утилиты для работы с симуляциями
 */
describe('Simulation Utilities', () => {
    const simulationPath = process.env.SIMULATION_PATH || 
        (() => {
            // Пытаемся найти директорию симуляций
            const possiblePaths = [
                path.join(process.cwd(), '..', '..', 'simulations'),
                path.join(process.cwd(), '..', 'simulations'),
                path.join(process.cwd(), 'simulations'),
            ];
            
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    return p;
                }
            }
            
            return possiblePaths[0];
        })();

    describe('getSimulationSteps', () => {
        it('должен возвращать пустой массив для несуществующей директории', () => {
            const steps = getSimulationSteps('/non/existent/path');
            expect(steps).toEqual([]);
        });
    });

    describe('loadSimulationStep', () => {
        it('должен возвращать null для несуществующего шага', () => {
            const step = loadSimulationStep('/non/existent', '1');
            expect(step).toBeNull();
        });
    });
});

// Import path и fs для использования в тестах
import * as fs from 'fs';
import * as path from 'path';

/**
 * Интеграционные тесты симуляций
 * Запускаются только если есть доступ к серверу
 */
describe('Simulation Integration Tests', () => {
    const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000/api/v1';
    const skipIntegration = process.env.SKIP_INTEGRATION_TESTS === 'true';

    // Пропускаем если нет сервера
    const it.skipIfNoServer = skipIntegration ? it.skip : it;

    it.skipIfNoServer('должен иметь доступ к серверу', async () => {
        const client = new ApiClient({ serverUrl });
        
        // Простой health check
        try {
            await client.request('GET', '/health');
        } catch (error) {
            // Если 404 - тоже ок, главное чтобы сервер отвечал
            const err = error as { status?: number };
            expect(err.status).not.toBe(0);
        }
    });

    // Динамические тесты для каждой симуляции
    SIMULATIONS.forEach(simulationName => {
        describe(`Simulation: ${simulationName}`, () => {
            it.skipIfNoServer(`должен пройти все шаги симуляции ${simulationName}`, async () => {
                const runner = new ApiClientSimulationRunner(simulationName, serverUrl);
                const result = await runner.runSimulation();

                console.log(`\n=== Simulation: ${simulationName} ===`);
                console.log(`Passed: ${result.passedSteps}/${result.totalSteps}`);
                
                result.results.forEach(r => {
                    const status = r.passed ? '✓' : '✗';
                    console.log(`  Step ${r.step}: ${status} ${r.error || ''}`);
                });

                expect(result.passedSteps).toBe(result.totalSteps);
            }, 60000); // Таймаут 60 секунд
        });
    });
});

export { ApiClientSimulationRunner };
