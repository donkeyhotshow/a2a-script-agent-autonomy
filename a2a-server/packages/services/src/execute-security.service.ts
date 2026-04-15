/**
 * Execute Security Service - безопасность и лимиты для execute операций
 *
 * Реализует:
 * - Rate limiting для execute операций
 * - Timeout для длительных операций
 * - Sandboxing и изоляцию скриптов
 * - Проверки безопасности
 */

import {EventEmitter} from 'events';
import {evaluatePathRules, defaultPathRules} from '../server/src/policy/path-rules.config.js';

/**
 * Конфигурация безопасности для execute
 */
export interface ExecuteSecurityConfig {
    /** Максимальное количество запросов в окно */
    maxRequestsPerWindow: number;
    /** Окно в миллисекундах */
    windowMs: number;
    /** Timeout для выполнения скрипта (мс) */
    scriptTimeoutMs: number;
    /** Максимальный размер кода (символы) */
    maxCodeSize: number;
    /** Максимальный размер входных данных (байты) */
    maxInputSize: number;
    /** Разрешённые модули в sandbox */
    allowedModules: string[];
    /** Заблокированные паттерны в коде */
    blockedPatterns: RegExp[];
    /** Максимальная глубина рекурсии */
    maxRecursionDepth: number;
    /** Максимальный размер вывода (байты) */
    maxOutputSize: number;
}

/**
 * Информация о rate limit
 */
export interface RateLimitInfo {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
}

/**
 * Результат проверки безопасности
 */
export interface SecurityCheckResult {
    allowed: boolean;
    error?: string;
    code?: string;
}

/**
 * Метрики выполнения
 */
export interface ExecuteMetrics {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    rateLimitedExecutions: number;
    timedOutExecutions: number;
    averageDurationMs: number;
}

/**
 * Хранилище состояний rate limiting
 */
interface RateLimitWindow {
    count: number;
    resetAt: number;
}

/**
 * Стандартная конфигурация безопасности
 */
export const DEFAULT_SECURITY_CONFIG: ExecuteSecurityConfig = {
    maxRequestsPerWindow: 100,
    windowMs: 60000, // 1 минута
    scriptTimeoutMs: 30000, // 30 секунд
    maxCodeSize: 100000, // 100KB
    maxInputSize: 50000, // 50KB
    allowedModules: ['fs', 'path', 'util', 'crypto', 'buffer', 'stream', 'events', 'url', 'querystring', 'os'],
    blockedPatterns: [
        /process\.exit/,
        /process\.kill/,
        /child_process/,
        /cluster\./,
        /__dirname/,
        /__filename/,
        /require\s*\(\s*['"]/,
        /eval\s*\(/,
        /Function\s*\(/,
        /\.\s*prototype\s*\./,
        /global\./,
        /globalThis\./,
    ],
    maxRecursionDepth: 10,
    maxOutputSize: 1000000, // 1MB
};

/**
 * Сервис безопасности для execute операций
 */
export class ExecuteSecurityService extends EventEmitter {
    private config: ExecuteSecurityConfig;
    private rateLimitStore: Map<string, RateLimitWindow> = new Map();
    private metrics: ExecuteMetrics = {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        rateLimitedExecutions: 0,
        timedOutExecutions: 0,
        averageDurationMs: 0,
    };
    private totalDuration: number = 0;
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    constructor(config: Partial<ExecuteSecurityConfig> = {}) {
        super();
        this.config = {...DEFAULT_SECURITY_CONFIG, ...config};
        this.startCleanupInterval();
    }

    /**
     * Проверяет rate limit для клиента
     */
    checkRateLimit(clientId: string): RateLimitInfo {
        const now = Date.now();
        let window = this.rateLimitStore.get(clientId);

        if (!window || now >= window.resetAt) {
            window = {
                count: 0,
                resetAt: now + this.config.windowMs,
            };
            this.rateLimitStore.set(clientId, window);
        }

        window.count++;
        const remaining = Math.max(0, this.config.maxRequestsPerWindow - window.count);
        const allowed = window.count <= this.config.maxRequestsPerWindow;

        const result: RateLimitInfo = {
            allowed,
            remaining,
            resetAt: window.resetAt,
        };

        if (!allowed) {
            result.retryAfter = Math.ceil((window.resetAt - now) / 1000);
            this.metrics.rateLimitedExecutions++;
        }

        return result;
    }

    /**
     * Проверяет безопасность кода
     */
    checkCodeSecurity(code: string): SecurityCheckResult {
        // Проверка размера кода
        if (code.length > this.config.maxCodeSize) {
            return {
                allowed: false,
                error: `Code size exceeds maximum allowed size: ${this.config.maxCodeSize} bytes`,
                code: 'CODE_TOO_LARGE',
            };
        }

        // Проверка на заблокированные паттерны
        for (const pattern of this.config.blockedPatterns) {
            if (pattern.test(code)) {
                return {
                    allowed: false,
                    error: `Code contains blocked pattern: ${pattern.source}`,
                    code: 'BLOCKED_PATTERN',
                };
            }
        }

        return {allowed: true};
    }

    /**
     * Проверяет безопасность входных данных
     */
    checkInputSecurity(input: unknown): SecurityCheckResult {
        if (!input) {
            return {allowed: true};
        }

        // Проверка сериализованного размера
        const serialized = JSON.stringify(input);
        if (serialized.length > this.config.maxInputSize) {
            return {
                allowed: false,
                error: `Input size exceeds maximum allowed size: ${this.config.maxInputSize} bytes`,
                code: 'INPUT_TOO_LARGE',
            };
        }

        // Проверка на потенциально опасные объекты
        if (this.containsDangerousObjects(input)) {
            return {
                allowed: false,
                error: 'Input contains potentially dangerous objects',
                code: 'DANGEROUS_INPUT',
            };
        }

        return {allowed: true};
    }

    /**
     * Проверяет результат выполнения на безопасность
     */
    checkOutputSecurity(output: unknown): SecurityCheckResult {
        if (!output) {
            return {allowed: true};
        }

        const serialized = JSON.stringify(output);
        if (serialized.length > this.config.maxOutputSize) {
            return {
                allowed: false,
                error: `Output size exceeds maximum allowed size: ${this.config.maxOutputSize} bytes`,
                code: 'OUTPUT_TOO_LARGE',
            };
        }

        return {allowed: true};
    }

    /**
     * Checks a file path against path-level permission rules.
     * Blocks writes to .env, node_modules, .git, and system paths.
     * Inspired by OpenHarness PermissionChecker path_rules pattern.
     */
    checkFilePathSecurity(filePath: string): SecurityCheckResult {
        if (!filePath || typeof filePath !== 'string') {
            return {allowed: true};
        }
        const decision = evaluatePathRules(filePath, defaultPathRules);
        if (!decision.allowed) {
            return {
                allowed: false,
                error: `Write to protected path denied: ${decision.reason} (${filePath})`,
                code: 'PROTECTED_PATH',
            };
        }
        return {allowed: true};
    }

    /**
     * Проверяет наличие опасных объектов в данных
     */
    private containsDangerousObjects(obj: unknown, depth: number = 0): boolean {
        if (depth > this.config.maxRecursionDepth) {
            return true;
        }

        // Проверка на Function - включая стрелочные и методы объектов
        if (typeof obj === 'function') {
            return true;
        }

        if (obj === null || obj === undefined) {
            return false;
        }

        // Проверка Buffer
        if (Buffer.isBuffer(obj)) {
            return true;
        }

        // Рекурсивная проверка объектов
        if (Array.isArray(obj)) {
            return obj.some(item => this.containsDangerousObjects(item, depth + 1));
        }

        // Для объектов проверяем значения (включая методы объекта)
        if (typeof obj === 'object') {
            // Проверяем все значения объекта
            const objAny = obj as Record<string, unknown>;
            const keys = Object.keys(objAny);
            for (const key of keys) {
                // Блокируем прототипные свойства
                if (key === '__proto__' || key === 'constructor') {
                    return true;
                }

                // Рекурсивно проверяем значение
                const value = objAny[key];
                if (this.containsDangerousObjects(value, depth + 1)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Возвращает конфигурацию для sandbox
     */
    getSandboxConfig(): Record<string, unknown> {
        return {
            timeout: this.config.scriptTimeoutMs,
            allowedModules: this.config.allowedModules,
            maxRecursionDepth: this.config.maxRecursionDepth,
        };
    }

    /**
     * Возвращает timeout для скрипта
     */
    getScriptTimeout(): number {
        return this.config.scriptTimeoutMs;
    }

    /**
     * Обновляет метрики после выполнения
     */
    recordExecution(success: boolean, durationMs: number, timedOut: boolean = false): void {
        this.metrics.totalExecutions++;
        this.totalDuration += durationMs;
        this.metrics.averageDurationMs = Math.round(this.totalDuration / this.metrics.totalExecutions);

        if (success) {
            this.metrics.successfulExecutions++;
        } else if (timedOut) {
            this.metrics.timedOutExecutions++;
        } else {
            this.metrics.failedExecutions++;
        }

        this.emit('execution', {
            success,
            durationMs,
            timedOut,
            timestamp: Date.now(),
        });
    }

    /**
     * Возвращает текущие метрики
     */
    getMetrics(): ExecuteMetrics {
        return {...this.metrics};
    }

    /**
     * Сбрасывает метрики
     */
    resetMetrics(): void {
        this.metrics = {
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            rateLimitedExecutions: 0,
            timedOutExecutions: 0,
            averageDurationMs: 0,
        };
        this.totalDuration = 0;
    }

    /**
     * Обновляет конфигурацию
     */
    updateConfig(config: Partial<ExecuteSecurityConfig>): void {
        this.config = {...this.config, ...config};
    }

    /**
     * Запускает интервал очистки устаревших записей rate limit
     */
    private startCleanupInterval(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            const entries = Array.from(this.rateLimitStore.entries());
            for (const [key, window] of entries) {
                if (now >= window.resetAt) {
                    this.rateLimitStore.delete(key);
                }
            }
        }, this.config.windowMs);

        // Не блокируем процесс выхода
        if (this.cleanupInterval.unref) {
            this.cleanupInterval.unref();
        }
    }

    /**
     * Очищает все хранилища
     */
    dispose(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.rateLimitStore.clear();
        this.removeAllListeners();
    }
}

// Экспорт синглтона
let securityServiceInstance: ExecuteSecurityService | null = null;

/**
 * Получить синглтон ExecuteSecurityService
 */
export function getExecuteSecurityService(config?: Partial<ExecuteSecurityConfig>): ExecuteSecurityService {
    if (!securityServiceInstance) {
        securityServiceInstance = new ExecuteSecurityService(config);
    }
    return securityServiceInstance;
}

// Экспорт по умолчанию
export const executeSecurityService = getExecuteSecurityService();
