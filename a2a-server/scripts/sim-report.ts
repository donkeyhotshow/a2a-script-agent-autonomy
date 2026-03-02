#!/usr/bin/env tsx

/**
 * Скрипт для генерации отчета по всем симуляциям
 *
 * Использование:
 *   npm run sim:report [options]
 *
 * Параметры:
 *   --status=<status>   Фильтр по статусу: passed, partial, failed, not-run, all
 *   --output=<file>     Сохранить отчет в файл
 *   --json              Вывод в формате JSON
 *   --verbose, -v       Подробный вывод с деталями ошибок
 *   --help, -h          Показать справку
 *
 * Примеры:
 *   npm run sim:report
 *   npm run sim:report -- --status=failed
 *   npm run sim:report -- --output=report.txt
 *   npm run sim:report -- --json
 *   npm run sim:report -- --verbose
 */

import {readFileSync, existsSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Zod Схемы для валидации
// ============================================

const ActionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    priority: z.number().optional(),
});

const BaseResponseSchema = z.object({
    success: z.boolean(),
    timestamp: z.string(),
});

const ActionProposalResultSchema = z.object({
    context: z.record(z.unknown()),
    proposedActions: z.array(ActionSchema),
});

const ActionExecutingResultSchema = z.object({
    executingAction: ActionSchema,
    nextSteps: z.array(ActionSchema),
});

const ActionCompletedResultSchema = z.object({
    actionId: z.string(),
    summary: z.string(),
});

const ActionErrorResultSchema = z.object({
    actionId: z.string(),
    error: z.record(z.unknown()),
    canRetry: z.boolean(),
});

const ServerResponseSchema = z.object({
    protocolVersion: z.string().optional(),
    data: z.object({
        type: z.string(),
        result: z.record(z.unknown()),
    }).optional(),
    type: z.string().optional(),
    result: z.record(z.unknown()).optional(),
    response: z.record(z.unknown()).optional(),
});

// ============================================
// Типы
// ============================================

type SimulationStatus = 'passed' | 'partial' | 'failed' | 'not-run';

interface SimulationInfo {
    name: string;
    path: string;
    hasRequest: boolean;
    hasResponse: boolean;
    hasServerResponse: boolean;
    hasNotes: boolean;
    serverResponse?: any;
    goldStandard?: any;
    validationErrors: ValidationError[];
    goldStandardMatch: boolean;
    goldStandardSimilarity: number;
    structuralValid: boolean;
    protocolVersion?: string;
    responseType?: string;
}

interface ValidationError {
    path: string;
    message: string;
    code: string;
}

interface CliArgs {
    status: SimulationStatus | 'all';
    output: string | null;
    json: boolean;
    verbose: boolean;
    help: boolean;
}

// ============================================
// Функции валидации и сравнения
// ============================================

/**
 * Универсальное извлечение данных из ответа
 */
function extractData(response: any): any {
    if (response.data?.result) {
        return response.data;
    }
    if (response.response) {
        return response;
    }
    return response;
}

/**
 * Валидация структуры ответа
 */
function validateStructure(data: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data || typeof data !== 'object') {
        errors.push({path: '', message: 'Ответ не является объектом', code: 'INVALID_JSON'});
        return errors;
    }

    const result = ServerResponseSchema.safeParse(data);
    if (!result.success) {
        result.error.errors.forEach(err => {
            errors.push({
                path: err.path.join('.'),
                message: err.message,
                code: 'ZOD_ERROR'
            });
        });
    }

    return errors;
}

/**
 * Глубокое сравнение для подсчета similarity
 */
function compareData(serverData: any, goldData: any): { match: boolean; similarity: number } {
    const ignoreList = ['sessionId', 'createdAt', 'startedAt', 'completedAt', 'promiseId', 'id', 'timestamp'];

    function compare(obj1: any, obj2: any): { total: number; matched: number } {
        let total = 0;
        let matched = 0;

        const keys1 = obj1 ? Object.keys(obj1) : [];
        const keys2 = obj2 ? Object.keys(obj2) : [];
        const allKeys = new Set([...keys1, ...keys2]);

        for (const key of allKeys) {
            if (ignoreList.includes(key)) {
                total++;
                matched++;
                continue;
            }

            const val1 = obj1?.[key];
            const val2 = obj2?.[key];

            total++;

            if (val1 === undefined || val2 === undefined) continue;

            if (typeof val1 === 'object' && typeof val2 === 'object' && val1 && val2) {
                const nested = compare(val1, val2);
                total += nested.total - 1;
                matched += nested.matched - 1;
            } else if (JSON.stringify(val1) === JSON.stringify(val2)) {
                matched++;
            }
        }

        return {total, matched};
    }

    const result = compare(serverData, goldData);
    const similarity = result.total > 0 ? Math.round((result.matched / result.total) * 100) : 0;

    return {match: similarity === 100, similarity};
}

/**
 * Валидация одной симуляции
 */
function validateSimulation(simDir: string, name: string): SimulationInfo {
    const info: SimulationInfo = {
        name,
        path: simDir,
        hasRequest: existsSync(join(simDir, 'request.json')),
        hasResponse: existsSync(join(simDir, 'response.json')),
        hasServerResponse: existsSync(join(simDir, 'server-response.json')),
        hasNotes: existsSync(join(simDir, 'NOTES.md')),
        validationErrors: [],
        goldStandardMatch: false,
        goldStandardSimilarity: 0,
        structuralValid: true,
    };

    // Читаем server-response.json если есть
    if (info.hasServerResponse) {
        try {
            const content = readFileSync(join(simDir, 'server-response.json'), 'utf-8');
            info.serverResponse = JSON.parse(content);

            // Извлекаем данные и тип
            const extractedData = extractData(info.serverResponse);
            info.responseType = extractedData?.type;
            info.protocolVersion = info.serverResponse?.protocolVersion;

            // Валидируем структуру
            info.validationErrors = validateStructure(extractedData);
            info.structuralValid = info.validationErrors.length === 0;

        } catch (err: any) {
            info.validationErrors = [{path: '', message: `Ошибка чтения: ${err.message}`, code: 'READ_ERROR'}];
            info.structuralValid = false;
        }
    }

    // Сравниваем с gold standard если есть оба файла
    if (info.hasResponse && info.hasServerResponse && info.serverResponse) {
        try {
            const goldStandard = JSON.parse(readFileSync(join(simDir, 'response.json'), 'utf-8'));
            info.goldStandard = goldStandard;

            const goldData = extractData(goldStandard);
            const serverData = extractData(info.serverResponse);

            // Сравниваем тип
            const goldType = goldData?.type;
            const serverType = serverData?.type;

            // Глубокое сравнение структуры
            const comparison = compareData(serverData, goldData);

            info.goldStandardMatch = goldType === serverType && comparison.match;
            info.goldStandardSimilarity = comparison.similarity;

        } catch (err: any) {
            info.goldStandardMatch = false;
            info.goldStandardSimilarity = 0;
        }
    }

    return info;
}

// Найти все симуляции
function findSimulations(baseDir: string): SimulationInfo[] {
    const simulations: SimulationInfo[] = [];

    try {
        const entries = readdirSync(baseDir);

        for (const entry of entries) {
            const fullPath = join(baseDir, entry);
            const stat = statSync(fullPath);

            if (stat.isDirectory()) {
                const requestPath = join(fullPath, 'request.json');
                if (existsSync(requestPath)) {
                    const info = validateSimulation(fullPath, entry);
                    simulations.push(info);
                }
            }
        }
    } catch (err: any) {
        console.error(`Error: ${err.message}`);
    }

    return simulations.sort((a, b) => a.name.localeCompare(b.name));
}

// Определить статус
function getStatus(info: SimulationInfo): SimulationStatus {
    if (!info.hasServerResponse) {
        return 'not-run';
    }

    if (info.validationErrors.length > 0 || !info.structuralValid) {
        return 'failed';
    }

    if (!info.goldStandardMatch) {
        return 'partial';
    }

    return 'passed';
}

// ============================================
// CLI интерфейс
// ============================================

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);

    let status: SimulationStatus | 'all' = 'all';
    const statusArg = args.find(a => a.startsWith('--status='));
    if (statusArg) {
        const statusValue = statusArg.split('=')[1];
        if (['passed', 'partial', 'failed', 'not-run', 'all'].includes(statusValue)) {
            status = statusValue as SimulationStatus | 'all';
        }
    }

    let output: string | null = null;
    const outputArg = args.find(a => a.startsWith('--output='));
    if (outputArg) {
        output = outputArg.split('=')[1];
    }

    return {
        status,
        output,
        json: args.includes('--json') || args.includes('-j'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        help: args.includes('--help') || args.includes('-h'),
    };
}

function printHelp() {
    console.log(`
Использование: npm run sim:report [options]

Параметры:
  --status=<status>   Фильтр по статусу: passed, partial, failed, not-run, all (по умолчанию: all)
  --output=<file>     Сохранить отчет в файл
  --json              Вывод в формате JSON
  --verbose, -v       Подробный вывод с деталями ошибок
  --help, -h         Показать эту справку

Примеры:
  npm run sim:report
  npm run sim:report -- --status=failed
  npm run sim:report -- --output=report.txt
  npm run sim:report -- --json
  npm run sim:report -- --verbose
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

    const baseDir = join(__dirname, '..', '..', 'simulations');
    const lines: string[] = [];

    function log(...args: any[]) {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        lines.push(msg);
        console.log(...args);
    }

    log('\n' + '='.repeat(50));
    log('ОТЧЕТ ПО СИМУЛЯЦИЯМ');
    log(`Дата: ${new Date().toISOString().split('T')[0]}`);
    log('='.repeat(50));

    if (!existsSync(baseDir)) {
        log(`\n❌ Директория симуляций не найдена: ${baseDir}`);
        log('   Создайте первую симуляцию: npm run sim:create <action-name>');
        process.exit(1);
    }

    log('\n📊 Сканирование симуляций...\n');
    const simulations = findSimulations(baseDir);

    if (simulations.length === 0) {
        log('Симуляции не найдены.');
        log('Создайте первую симуляцию: npm run sim:create <action-name>');
        process.exit(0);
    }

    // Фильтрация по статусу
    const filteredSimulations = simulations.filter(sim => {
        if (cliArgs.status === 'all') return true;
        return getStatus(sim) === cliArgs.status;
    });

    log(`Найдено симуляций: ${filteredSimulations.length} (из ${simulations.length})`);
    if (cliArgs.status !== 'all') {
        log(`Фильтр: ${cliArgs.status}\n`);
    }

    // Выводим информацию о каждой симуляции
    let passed = 0;
    let partial = 0;
    let failed = 0;
    let notRun = 0;

    for (const sim of simulations) {
        const status = getStatus(sim);

        if (status === 'passed') passed++;
        else if (status === 'partial') partial++;
        else if (status === 'failed') failed++;
        else notRun++;

        // Пропускаем если не проходит фильтр
        if (cliArgs.status !== 'all' && status !== cliArgs.status) continue;

        const statusEmoji = status === 'passed' ? '✅' : status === 'partial' ? '🟡' : status === 'failed' ? '🔴' : '⚪';

        log(`Симуляция: ${sim.name}`);
        log(`  ${statusEmoji} Статус: ${status.toUpperCase()}`);

        if (sim.hasServerResponse) {
            if (sim.responseType) {
                log(`  📝 Тип ответа: ${sim.responseType}`);
            }

            if (sim.protocolVersion) {
                log(`  🔖 Protocol Version: ${sim.protocolVersion}`);
            }

            if (sim.validationErrors.length > 0) {
                log(`  ❌ Ошибки валидации:`);
                if (cliArgs.verbose) {
                    sim.validationErrors.forEach(err => {
                        const path = err.path ? `[${err.path}] ` : '';
                        log(`     - ${path}${err.message} (${err.code})`);
                    });
                } else {
                    log(`     Показать детали: npm run sim:report -- --verbose`);
                }
            }

            if (sim.hasResponse) {
                if (sim.goldStandardMatch) {
                    log(`  ✅ Gold Standard: совпадает (${sim.goldStandardSimilarity}%)`);
                } else if (cliArgs.verbose) {
                    log(`  ⚠️ Gold Standard: отличается (${sim.goldStandardSimilarity}%)`);
                } else {
                    log(`  ⚠️ Gold Standard: отличается (${sim.goldStandardSimilarity}%)`);
                    log(`     Детали: npm run sim:compare ${sim.name}`);
                }
            }
        } else {
            log(`  ⏳ Не запущена (запустите: npm run sim:run ${sim.name})`);
        }

        log('');
    }

    // Итоги
    const total = simulations.length;
    const filteredTotal = filteredSimulations.length;
    const successRate = filteredTotal > 0 ? Math.round((passed / filteredTotal) * 100) : 0;

    log('='.repeat(50));
    log('ИТОГО:');
    log(`   ✅ Пройдено: ${passed}/${filteredTotal} (${successRate}%)`);
    if (partial > 0) log(`   🟡 Частично: ${partial}`);
    if (failed > 0) log(`   ❌ Провалено: ${failed}`);
    if (notRun > 0) log(`   ⚪ Не запущено: ${notRun}`);
    log('='.repeat(50));

    // Рекомендации
    log('\n📋 Рекомендации:');

    if (notRun > 0) {
        log(`   - Запустите ${notRun} не запущенных симуляций`);
    }
    if (failed > 0) {
        log(`   - Исправьте ${failed} проваленных симуляций`);
    }
    if (passed === total && total > 0) {
        log('   🎉 Все симуляции пройдены!');
    }

    log('');

    // Сохранение в файл
    if (cliArgs.output) {
        try {
            writeFileSync(cliArgs.output, lines.join('\n'), 'utf-8');
            console.log(`\n📁 Отчет сохранен в: ${cliArgs.output}`);
        } catch (err: any) {
            console.error(`❌ Ошибка сохранения отчета: ${err.message}`);
        }
    }

    // JSON вывод
    if (cliArgs.json) {
        const output = {
            generatedAt: new Date().toISOString(),
            filter: cliArgs.status,
            total: filteredTotal,
            summary: {
                passed,
                partial,
                failed,
                notRun,
            },
            simulations: filteredSimulations.map(sim => ({
                name: sim.name,
                status: getStatus(sim),
                hasServerResponse: sim.hasServerResponse,
                responseType: sim.responseType,
                protocolVersion: sim.protocolVersion,
                structuralValid: sim.structuralValid,
                validationErrors: cliArgs.verbose ? sim.validationErrors : undefined,
                goldStandardMatch: sim.goldStandardMatch,
                goldStandardSimilarity: sim.goldStandardSimilarity,
            })),
        };
        console.log('\n' + JSON.stringify(output, null, 2));
    }
}

main();
