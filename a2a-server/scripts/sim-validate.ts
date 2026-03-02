#!/usr/bin/env tsx

/**
 * Скрипт для валидации симуляции по схеме
 *
 * Использование:
 *   npm run sim:validate <sim-dir> [--verbose]
 *   npm run sim:validate <sim-dir> [--format=json]
 *
 * Пример:
 *   npm run sim:validate fix-vue-imports
 *   npm run sim:validate fix-vue-imports -- --verbose
 *   npm run sim:validate fix-vue-imports -- --json
 *
 * Результат:
 *   - Проверяет server-response.json по Zod-схеме
 *   - Выводит результаты валидации
 *   - Поддерживает формат JSON и verbose режим
 */

import {readFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Zod Схемы для валидации
// ============================================

// Схема для BaseResponse
const BaseResponseSchema = z.object({
    success: z.boolean(),
    timestamp: z.string().datetime(),
});

// Схема для Action
const ActionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    priority: z.number().optional(),
    dsl: z.record(z.unknown()).optional(),
    dslScript: z.string().optional(),
});

// Схема для FallbackAction
const FallbackActionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    reason: z.string().optional(),
});

// Схема для ActionProposalResult
const ActionProposalResultSchema = z.object({
    context: z.record(z.unknown()),
    proposedActions: z.array(ActionSchema),
    fallbackActions: z.array(FallbackActionSchema).optional(),
});

// Схема для ActionProposalResponse
const ActionProposalResponseSchema = BaseResponseSchema.extend({
    type: z.literal('action_proposal'),
    result: ActionProposalResultSchema,
});

// Схема для NextStep
const NextStepSchema = z.object({
    actionId: z.string(),
    title: z.string(),
});

// Схема для ActionExecutingResult
const ActionExecutingResultSchema = z.object({
    executingAction: ActionSchema,
    nextSteps: z.array(ActionSchema),
});

// Схема для ActionExecutingResponse
const ActionExecutingResponseSchema = BaseResponseSchema.extend({
    type: z.literal('action_executing'),
    result: ActionExecutingResultSchema,
});

// Схема для ActionProgressResult
const ActionProgressResultSchema = z.object({
    actionId: z.string(),
    currentStep: z.object({
        id: z.string(),
        title: z.string(),
        code: z.string().optional(),
        progress: z.number(),
    }),
    completedSteps: z.array(z.string()),
    remainingSteps: z.array(z.string()),
    message: z.string().optional(),
});

// Схема для ActionProgressResponse
const ActionProgressResponseSchema = BaseResponseSchema.extend({
    type: z.literal('action_progress'),
    result: ActionProgressResultSchema,
});

// Схема для ActionCompletedResult
const ActionCompletedResultSchema = z.object({
    actionId: z.string(),
    summary: z.string(),
    output: z.unknown().optional(),
    filesModified: z.array(z.string()).optional(),
    executionTimeMs: z.number().optional(),
});

// Схема для ActionCompletedResponse
const ActionCompletedResponseSchema = BaseResponseSchema.extend({
    type: z.literal('action_completed'),
    result: ActionCompletedResultSchema,
});

// Схема для ActionError
const ActionErrorSchema = z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    stack: z.string().optional(),
});

// Схема для ActionErrorResult
const ActionErrorResultSchema = z.object({
    actionId: z.string(),
    error: ActionErrorSchema,
    failedStep: z.string().optional(),
    canRetry: z.boolean(),
});

// Схема для ActionErrorResponse
const ActionErrorResponseSchema = BaseResponseSchema.extend({
    type: z.literal('action_error'),
    result: ActionErrorResultSchema,
});

// Общая схема ответа сервера
const ServerResponseSchema = z.object({
    protocolVersion: z.string().optional(),
    data: z.union([
        ActionProposalResponseSchema,
        ActionExecutingResponseSchema,
        ActionProgressResponseSchema,
        ActionCompletedResponseSchema,
        ActionErrorResponseSchema,
    ]).optional(),
    // Альтернативная структура (без data)
    type: z.string().optional(),
    result: z.record(z.unknown()).optional(),
    response: z.record(z.unknown()).optional(),
});

// ============================================
// Типы
// ============================================

type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
    responseType?: string;
    protocolVersion?: string;
};

type ValidationError = {
    path: string;
    message: string;
    code: string;
};

// ============================================
// Функции валидации
// ============================================

/**
 * Валидация по Zod-схеме
 */
function validateWithZod(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Проверка на валидный JSON
    if (!data || typeof data !== 'object') {
        return {
            valid: false,
            errors: [{path: '', message: 'Ответ не является объектом', code: 'INVALID_JSON'}],
            warnings: []
        };
    }

    // Проверка protocolVersion
    if (!data.protocolVersion) {
        warnings.push('Отсутствует поле protocolVersion (рекомендуется)');
    }

    // Пробуем валидировать по схеме
    const parseResult = ServerResponseSchema.safeParse(data);

    if (!parseResult.success) {
        const zodErrors = parseResult.error.errors;
        zodErrors.forEach(err => {
            errors.push({
                path: err.path.join('.'),
                message: err.message,
                code: 'ZOD_ERROR'
            });
        });

        return {valid: false, errors, warnings};
    }

    // Извлекаем тип ответа
    let responseType: string | undefined;
    if (data.data?.type) {
        responseType = data.data.type;
    } else if (data.type) {
        responseType = data.type;
    }

    return {
        valid: true,
        errors: [],
        warnings,
        responseType,
        protocolVersion: data.protocolVersion
    };
}

/**
 * Валидация с проверкой response.data (новая структура сервера)
 */
function validateResponse(data: any): ValidationResult {
    const result = validateWithZod(data);

    // Дополнительная проверка: если есть поле data, проверяем его
    if (data?.data) {
        const dataParseResult = ServerResponseSchema.safeParse(data.data);
        if (!dataParseResult.success) {
            result.warnings.push('Поле response.data имеет нестандартную структуру');
        }
    }

    return result;
}

/**
 * Форматирование ошибок для вывода
 */
function formatErrors(errors: ValidationError[]): string[] {
    return errors.map(err => {
        const path = err.path ? `[${err.path}] ` : '';
        return `${path}${err.message} (${err.code})`;
    });
}

// ============================================
// CLI интерфейс
// ============================================

interface CliArgs {
    simDir: string;
    verbose: boolean;
    json: boolean;
    help: boolean;
}

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);

    return {
        simDir: args[0] || '',
        verbose: args.includes('--verbose') || args.includes('-v'),
        json: args.includes('--json') || args.includes('-j'),
        help: args.includes('--help') || args.includes('-h'),
    };
}

function printHelp() {
    console.log(`
Использование: npm run sim:validate <sim-dir> [options]

Параметры:
  <sim-dir>          Директория симуляции (обязательно)
  --verbose, -v     Подробный вывод
  --json, -j        Вывод в формате JSON
  --help, -h        Показать эту справку

Примеры:
  npm run sim:validate fix-vue-imports
  npm run sim:validate fix-vue-imports -- --verbose
  npm run sim:validate fix-vue-imports -- --json
`);
}

// ============================================
// Основная логика
// ============================================

function main() {
    const cliArgs = parseArgs();

    if (cliArgs.help) {
        printHelp();
        process.exit(0);
    }

    if (!cliArgs.simDir) {
        console.error('❌ Ошибка: укажите директорию симуляции');
        console.error('   Использование: npm run sim:validate <sim-dir>');
        console.error('   Пример: npm run sim:validate fix-vue-imports');
        console.error('\nДля справки: npm run sim:validate -- --help');
        process.exit(1);
    }

    const baseDir = join(__dirname, '..', '..', 'simulations');
    const simDir = join(baseDir, cliArgs.simDir);
    const responsePath = join(simDir, 'server-response.json');

    // Проверка существования директории
    if (!existsSync(simDir)) {
        const errorMsg = `❌ Симуляция не найдена: ${cliArgs.simDir}`;
        if (cliArgs.json) {
            console.log(JSON.stringify({valid: false, error: errorMsg}, null, 2));
        } else {
            console.error(errorMsg);
            console.error(`   Путь: ${simDir}`);
        }
        process.exit(1);
    }

    // Проверка существования server-response.json
    if (!existsSync(responsePath)) {
        const errorMsg = '❌ server-response.json не найден';
        if (cliArgs.json) {
            console.log(JSON.stringify({valid: false, error: errorMsg}, null, 2));
        } else {
            console.error(errorMsg);
            console.error(`   Сначала запустите симуляцию: npm run sim:run ${cliArgs.simDir}`);
        }
        process.exit(1);
    }

    // Читаем server-response.json
    let responseData: any;
    try {
        const content = readFileSync(responsePath, 'utf-8');
        responseData = JSON.parse(content);
    } catch (err: any) {
        const errorMsg = `Ошибка чтения JSON: ${err.message}`;
        if (cliArgs.json) {
            console.log(JSON.stringify({valid: false, error: errorMsg}, null, 2));
        } else {
            console.error(`❌ ${errorMsg}`);
        }
        process.exit(1);
    }

    // Валидируем
    const result = validateResponse(responseData);

    // Форматируем результат
    if (cliArgs.json) {
        const output: any = {
            valid: result.valid,
            simulation: cliArgs.simDir,
            responseType: result.responseType,
            protocolVersion: result.protocolVersion,
        };

        if (result.errors.length > 0) {
            output.errors = result.errors;
        }

        if (result.warnings.length > 0) {
            output.warnings = result.warnings;
        }

        console.log(JSON.stringify(output, null, 2));
    } else {
        console.log(`\n📁 Валидация симуляции: ${cliArgs.simDir}`);
        console.log(`   Path: ${simDir}`);
        console.log('');

        if (result.valid) {
            console.log('✅ Валидация пройдена');

            if (result.responseType) {
                console.log(`   📝 Тип ответа: ${result.responseType}`);
            }

            if (result.protocolVersion) {
                console.log(`   🔖 Protocol Version: ${result.protocolVersion}`);
            }

            if (result.warnings.length > 0 && cliArgs.verbose) {
                console.log('\n⚠️  Предупреждения:');
                result.warnings.forEach(w => console.log(`   - ${w}`));
            }
        } else {
            console.log('❌ Валидация провалена\n');

            console.log('Ошибки:');
            formatErrors(result.errors).forEach(err => {
                console.log(`   - ${err}`);
            });

            if (result.warnings.length > 0) {
                console.log('\n⚠️  Предупреждения:');
                result.warnings.forEach(w => console.log(`   - ${w}`));
            }
        }
    }

    process.exit(result.valid ? 0 : 1);
}

main();
