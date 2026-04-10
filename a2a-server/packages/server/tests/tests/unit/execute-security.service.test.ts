/**
 * Тесты для ExecuteSecurityService
 */

import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {
    ExecuteSecurityService,
    DEFAULT_SECURITY_CONFIG,
    getExecuteSecurityService,
} from '../../src/services/execute-security.service.js';

describe('ExecuteSecurityService', () => {
    let service: ExecuteSecurityService;

    beforeEach(() => {
        service = new ExecuteSecurityService();
    });

    afterEach(() => {
        service.dispose();
    });

    describe('Rate Limiting', () => {
        it('должен позволить запросы в пределах лимита', () => {
            const result = service.checkRateLimit('client-1');
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(DEFAULT_SECURITY_CONFIG.maxRequestsPerWindow - 1);
        });

        it('должен заблокировать после превышения лимита', () => {
            const maxRequests = DEFAULT_SECURITY_CONFIG.maxRequestsPerWindow;

            // Выполняем maxRequests запросов
            for (let i = 0; i < maxRequests; i++) {
                service.checkRateLimit('client-limit-test');
            }

            // Следующий запрос должен быть заблокирован
            const result = service.checkRateLimit('client-limit-test');
            expect(result.allowed).toBe(false);
            expect(result.retryAfter).toBeGreaterThan(0);
        });

        it('должен использовать разные окна для разных клиентов', () => {
            service.checkRateLimit('client-a');
            service.checkRateLimit('client-a');
            
            const resultA = service.checkRateLimit('client-a');
            const resultB = service.checkRateLimit('client-b');

            // Client B должен иметь больше оставшихся запросов
            expect(resultB.remaining).toBeGreaterThan(resultA.remaining);
        });
    });

    describe('Code Security Checks', () => {
        it('должен пропускать безопасный код', () => {
            const safeCode = `
                function run(input) {
                    return { result: input.value * 2 };
                }
            `;
            const result = service.checkCodeSecurity(safeCode);
            expect(result.allowed).toBe(true);
        });

        it('должен блокировать слишком большой код', () => {
            const largeCode = 'x'.repeat(DEFAULT_SECURITY_CONFIG.maxCodeSize + 1);
            const result = service.checkCodeSecurity(largeCode);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe('CODE_TOO_LARGE');
        });

        it('должен блокировать process.exit', () => {
            const dangerousCode = 'process.exit(0)';
            const result = service.checkCodeSecurity(dangerousCode);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe('BLOCKED_PATTERN');
        });

        it('должен блокировать eval', () => {
            const dangerousCode = 'eval("dangerous")';
            const result = service.checkCodeSecurity(dangerousCode);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe('BLOCKED_PATTERN');
        });

        it('должен блокировать child_process', () => {
            const dangerousCode = 'const { exec } = require("child_process")';
            const result = service.checkCodeSecurity(dangerousCode);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe('BLOCKED_PATTERN');
        });
    });

    describe('Input Security Checks', () => {
        it('должен пропускать безопасные входные данные', () => {
            const safeInput = {name: 'test', value: 123};
            const result = service.checkInputSecurity(safeInput);
            expect(result.allowed).toBe(true);
        });

        it('должен блокировать слишком большие входные данные', () => {
            const largeInput = {data: 'x'.repeat(DEFAULT_SECURITY_CONFIG.maxInputSize + 1)};
            const result = service.checkInputSecurity(largeInput);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe('INPUT_TOO_LARGE');
        });

        it('должен блокировать объекты с Function', () => {
            const dangerousInput = {fn: () => 'dangerous'};
            const result = service.checkInputSecurity(dangerousInput);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe('DANGEROUS_INPUT');
        });

        it('должен блокировать объекты с __proto__', () => {
            const dangerousInput = {['__proto__']: {evil: true}};
            const result = service.checkInputSecurity(dangerousInput);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe('DANGEROUS_INPUT');
        });
    });

    describe('Output Security Checks', () => {
        it('должен пропускать безопасный вывод', () => {
            const safeOutput = {result: 'success', data: [1, 2, 3]};
            const result = service.checkOutputSecurity(safeOutput);
            expect(result.allowed).toBe(true);
        });

        it('должен блокировать слишком большой вывод', () => {
            const largeOutput = {data: 'x'.repeat(DEFAULT_SECURITY_CONFIG.maxOutputSize + 1)};
            const result = service.checkOutputSecurity(largeOutput);
            expect(result.allowed).toBe(false);
            expect(result.code).toBe('OUTPUT_TOO_LARGE');
        });
    });

    describe('Metrics', () => {
        it('должен записывать успешные выполнения', () => {
            service.recordExecution(true, 100);
            const metrics = service.getMetrics();
            expect(metrics.totalExecutions).toBe(1);
            expect(metrics.successfulExecutions).toBe(1);
            expect(metrics.averageDurationMs).toBe(100);
        });

        it('должен записывать неудачные выполнения', () => {
            service.recordExecution(false, 50);
            const metrics = service.getMetrics();
            expect(metrics.totalExecutions).toBe(1);
            expect(metrics.failedExecutions).toBe(1);
        });

        it('должен записывать timeout выполнения', () => {
            service.recordExecution(false, 30000, true);
            const metrics = service.getMetrics();
            expect(metrics.timedOutExecutions).toBe(1);
        });

        it('должен сбрасывать метрики', () => {
            service.recordExecution(true, 100);
            service.resetMetrics();
            const metrics = service.getMetrics();
            expect(metrics.totalExecutions).toBe(0);
        });
    });

    describe('Configuration', () => {
        it('должен использовать пользовательскую конфигурацию', () => {
            const customService = new ExecuteSecurityService({
                maxRequestsPerWindow: 10,
                scriptTimeoutMs: 5000,
            });
            
            expect(customService.getScriptTimeout()).toBe(5000);
            customService.dispose();
        });

        it('должен обновлять конфигурацию', () => {
            service.updateConfig({maxRequestsPerWindow: 50});
            // Проверяем, что изменения применяются (через reset окна)
            const result = service.checkRateLimit('new-client');
            expect(result.remaining).toBe(49);
        });
    });

    describe('Singleton', () => {
        it('должен возвращать тот же экземпляр', () => {
            const instance1 = getExecuteSecurityService();
            const instance2 = getExecuteSecurityService();
            expect(instance1).toBe(instance2);
        });
    });
});
