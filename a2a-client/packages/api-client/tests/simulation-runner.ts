/**
 * Simulation Test Runner for API Client
 * 
 * Проигрывает симуляции из директории simulations/ против a2a-server
 * и проверяет корректность протокола.
 * 
 * @see docs/new-request-flow/API-CLIENT-SIMULATION-TESTS.md
 */

import * as fs from 'fs';
import * as path from 'path';

export interface SimulationStep {
    request: Record<string, unknown>;
    response?: Record<string, unknown>;
    serverTransformsRequest?: Record<string, unknown>;
    serverTransformsResponse?: Record<string, unknown>;
}

export interface SimulationResult {
    step: string;
    passed: boolean;
    error?: string;
    protocolValid: boolean;
}

export interface SimulationTestResult {
    simulationName: string;
    totalSteps: number;
    passedSteps: number;
    results: SimulationResult[];
}

/**
 * Валидация action-key shape согласно протоколу
 */
export function validateActionKeyShape(response: Record<string, unknown>): {
    valid: boolean;
    errors: string[];
} {
    const errors: string[] = [];
    
    // Проверяем result
    if (response.result !== undefined) {
        if (typeof response.result !== 'object' || response.result === null) {
            errors.push('result must be an object');
        } else {
            const result = response.result as Record<string, unknown>;
            const keys = Object.keys(result);
            
            // Допустимые типы действий
            const validActionTypes = [
                'read-file', 'write-file', 'script', 'rag-search',
                'execute-command', 'form', 'message', 'error'
            ];
            
            if (keys.length > 0) {
                const key = keys[0];
                if (!validActionTypes.includes(key)) {
                    errors.push(`Invalid action key: "${key}". Must be one of: ${validActionTypes.join(', ')}`);
                }
            }
        }
    }
    
    // Проверяем execute
    if (response.execute !== undefined) {
        if (typeof response.execute !== 'object' || response.execute === null) {
            errors.push('execute must be an object');
        } else {
            const execute = response.execute as Record<string, unknown>;
            const validExecuteTypes = ['form', 'message', 'script', 'read-file', 'write-file', 'execute-command', 'rag-search'];
            
            for (const key of Object.keys(execute)) {
                if (!validExecuteTypes.includes(key)) {
                    errors.push(`Invalid execute key: "${key}". Must be one of: ${validExecuteTypes.join(', ')}`);
                }
            }
        }
    }
    
    // Проверяем context
    if (response.context !== undefined) {
        if (typeof response.context !== 'object' || response.context === null) {
            errors.push('context must be an object');
        } else {
            const context = response.context as Record<string, unknown>;
            
            // Проверяем системные поля
            const validContextFields = ['session_id', 'version', 'new_task', 'continue', 'confirm', 'history', 'execution', 'docVirtual'];
            
            for (const key of Object.keys(context)) {
                if (!validContextFields.includes(key)) {
                    // Предупреждение, не ошибка
                    console.warn(`Unknown context field: "${key}"`);
                }
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Загрузка шага симуляции из директории
 */
export function loadSimulationStep(simulationPath: string, step: string): SimulationStep | null {
    const stepPath = path.join(simulationPath, step);
    
    if (!fs.existsSync(stepPath)) {
        return null;
    }
    
    const requestPath = path.join(stepPath, 'request.json');
    const responsePath = path.join(stepPath, 'response.json');
    const transformsRequestPath = path.join(stepPath, 'server-transforms-request.json');
    const transformsResponsePath = path.join(stepPath, 'server-transforms-response.json');
    
    if (!fs.existsSync(requestPath)) {
        return null;
    }
    
    return {
        request: JSON.parse(fs.readFileSync(requestPath, 'utf-8')),
        response: fs.existsSync(responsePath) ? JSON.parse(fs.readFileSync(responsePath, 'utf-8')) : undefined,
        serverTransformsRequest: fs.existsSync(transformsRequestPath) 
            ? JSON.parse(fs.readFileSync(transformsRequestPath, 'utf-8')) 
            : undefined,
        serverTransformsResponse: fs.existsSync(transformsResponsePath) 
            ? JSON.parse(fs.readFileSync(transformsResponsePath, 'utf-8')) 
            : undefined,
    };
}

/**
 * Получение списка шагов симуляции
 */
export function getSimulationSteps(simulationPath: string): string[] {
    if (!fs.existsSync(simulationPath)) {
        return [];
    }
    
    return fs.readdirSync(simulationPath)
        .filter(f => /^\d+$/.test(f))
        .sort((a, b) => parseInt(a) - parseInt(b));
}

/**
 * Базовый класс для запуска симуляций
 * 
 * Для использования необходимо расширить и реализовать executeRequest
 */
export abstract class BaseSimulationRunner {
    protected simulationName: string;
    protected simulationPath: string;
    
    constructor(simulationName: string, simulationsBasePath?: string) {
        this.simulationName = simulationName;
        this.simulationPath = path.join(
            simulationsBasePath || path.join(process.cwd(), '..', 'simulations'),
            simulationName
        );
    }
    
    /**
     * Выполняет запрос к серверу
     * Реализуется в подклассе
     */
    protected abstract executeRequest(request: Record<string, unknown>): Promise<Record<string, unknown>>;
    
    /**
     * Запускает один шаг симуляции
     */
    async runStep(step: string): Promise<SimulationResult> {
        const stepData = loadSimulationStep(this.simulationPath, step);
        
        if (!stepData) {
            return {
                step,
                passed: false,
                error: 'Step not found',
                protocolValid: false
            };
        }
        
        try {
            // Выполняем запрос
            const response = await this.executeRequest(stepData.request);
            
            // Валидируем протокол
            const validation = validateActionKeyShape(response);
            
            return {
                step,
                passed: validation.valid,
                protocolValid: validation.valid,
                error: validation.errors.length > 0 ? validation.errors.join('; ') : undefined
            };
        } catch (error) {
            return {
                step,
                passed: false,
                protocolValid: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    
    /**
     * Запускает всю симуляцию
     */
    async runSimulation(): Promise<SimulationTestResult> {
        const steps = getSimulationSteps(this.simulationPath);
        const results: SimulationResult[] = [];
        
        for (const step of steps) {
            const result = await this.runStep(step);
            results.push(result);
        }
        
        const passedSteps = results.filter(r => r.passed).length;
        
        return {
            simulationName: this.simulationName,
            totalSteps: steps.length,
            passedSteps,
            results
        };
    }
}

/**
 * Пример использования с ApiClient
 * 
 * ```typescript
 * import { ApiClient } from '../src/index.js';
 * import { BaseSimulationRunner } from './simulation-runner.js';
 * 
 * class ApiClientSimulationRunner extends BaseSimulationRunner {
 *     private client: ApiClient;
 * 
 *     constructor(simulationName: string) {
 *         super(simulationName);
 *         this.client = new ApiClient({
 *             serverUrl: process.env.TEST_SERVER_URL || 'http://localhost:3000/api/v1'
 *         });
 *     }
 * 
 *     protected async executeRequest(request: Record<string, unknown>): Promise<Record<string, unknown>> {
 *         const { action, context } = request as { 
 *             action?: Record<string, unknown>; 
 *             context?: Record<string, unknown> 
 *         };
 * 
 *         if (action?.invoke) {
 *             return await this.client.invoke(action.invoke as string, context || {});
 *         }
 *
 *         if (context?.session_id) {
 *             return await this.client.continueSession(context.session_id as string, context);
 *         }
 *
 *         throw new Error('Unknown request type');
 *     }
 * }
 * 
 * // Запуск
 * const runner = new ApiClientSimulationRunner('fix-vue-imports');
 * const result = await runner.runSimulation();
 * console.log(result);
 * ```
 */

export default {
    validateActionKeyShape,
    loadSimulationStep,
    getSimulationSteps,
    BaseSimulationRunner
};
