#!/usr/bin/env tsx

/**
 * Скрипт для сравнения invoke-capture.json с response.json (gold standard)
 *
 * Использование:
 *   npm run sim:compare <sim-dir> [options]
 *
 * Пример:
 *   npm run sim:compare fix-vue-imports
 *   npm run sim:compare fix-vue-imports -- --verbose
 *   npm run sim:compare fix-vue-imports -- --json
 *   npm run sim:compare fix-vue-imports -- --threshold=80
 *
 * Результат:
 *   - Сравнивает invoke-capture.json (или legacy server-response.json) с response.json
 *   - Выводит различия
 *   - Показывает процент совпадения (similarity score)
 *   - Использует Zod для структурной проверки
 */

import {readFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Zod Схемы для структурной проверки
// ============================================

const ActionSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    priority: z.number().optional(),
});

const ActionResultSchema = z.object({
    actionId: z.string().optional(),
    title: z.string().optional(),
    context: z.record(z.unknown()).optional(),
    proposedActions: z.array(ActionSchema).optional(),
    executingAction: ActionSchema.optional(),
    nextSteps: z.array(ActionSchema).optional(),
    summary: z.string().optional(),
    output: z.unknown().optional(),
    error: z.record(z.unknown()).optional(),
});

// ============================================
// Типы
// ============================================

interface Difference {
    type: 'missing' | 'extra' | 'mismatch';
    path: string;
    expected?: any;
    actual?: any;
}

interface CompareResult {
    match: boolean;
    similarity: number;
    differences: Difference[];
    structuralValid: boolean;
    structuralErrors: string[];
    totalKeys: number;
    matchedKeys: number;
}

// ============================================
// Унифицированное извлечение данных из serverResponse
// ============================================

/**
 * Извлекает данные из serverResponse.data или из корня
 * Сервер возвращает данные в поле data, либо в корне ответа
 */
function extractServerData(serverResponse: any): any {
    if (serverResponse.data) {
        if (serverResponse.data.result) {
            return serverResponse.data;
        }
        return serverResponse.data;
    }

    if (serverResponse.response) {
        return serverResponse;
    }

    return serverResponse;
}

/**
 * Извлекает данные из gold standard
 */
function extractGoldData(goldStandard: any): any {
    if (goldStandard.response) {
        return goldStandard;
    }
    return goldStandard;
}

// ============================================
// Функции сравнения
// ============================================

/**
 * Глубокое сравнение объектов с подсчетом similarity
 */
function deepCompare(obj1: any, obj2: any, path: string = ''): CompareResult {
    const differences: Difference[] = [];
    let totalKeys = 0;
    let matchedKeys = 0;

    const keys1 = obj1 ? Object.keys(obj1) : [];
    const keys2 = obj2 ? Object.keys(obj2) : [];
    const allKeys = new Set([...keys1, ...keys2]);

    const ignoreList = ['sessionId', 'createdAt', 'startedAt', 'completedAt', 'promiseId', 'id', 'timestamp'];

    for (const key of allKeys) {
        if (ignoreList.includes(key)) {
            totalKeys++;
            matchedKeys++;
            continue;
        }

        const currentPath = path ? `${path}.${key}` : key;
        const val1 = obj1?.[key];
        const val2 = obj2?.[key];

        totalKeys++;

        if (!(key in obj1)) {
            differences.push({type: 'missing', path: currentPath, expected: val2});
            continue;
        }
        if (!(key in obj2)) {
            differences.push({type: 'extra', path: currentPath, actual: val1});
            continue;
        }

        if (typeof val1 !== typeof val2) {
            differences.push({type: 'mismatch', path: currentPath, expected: typeof val2, actual: typeof val1});
            continue;
        }

        if (val1 && typeof val1 === 'object' && val2 && typeof val2 === 'object') {
            if (Array.isArray(val1) !== Array.isArray(val2)) {
                differences.push({type: 'mismatch', path: currentPath, expected: 'array', actual: 'object'});
                continue;
            }

            const nested = deepCompare(val1, val2, currentPath);
            differences.push(...nested.differences);
            totalKeys += nested.totalKeys - 1;
            matchedKeys += nested.matchedKeys - 1;
        } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
            differences.push({type: 'mismatch', path: currentPath, expected: val2, actual: val1});
        } else {
            matchedKeys++;
        }
    }

    const total = totalKeys > 0 ? totalKeys : 1;
    const similarity = Math.round((matchedKeys / total) * 100);

    return {
        match: differences.length === 0,
        similarity,
        differences,
        structuralValid: true,
        structuralErrors: [],
        totalKeys,
        matchedKeys,
    };
}

/**
 * Структурная валидация с помощью Zod
 */
function validateStructure(data: any): { valid: boolean; errors: string[] } {
    try {
        const result = ActionResultSchema.safeParse(data);
        if (!result.success) {
            return {
                valid: false,
                errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
            };
        }
        return {valid: true, errors: []};
    } catch (err: any) {
        return {valid: false, errors: [err.message]};
    }
}

// ============================================
// CLI интерфейс
// ============================================

interface CliArgs {
    simDir: string;
    verbose: boolean;
    json: boolean;
    threshold: number;
    help: boolean;
}

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);

    let threshold = 100;
    const thresholdArg = args.find(a => a.startsWith('--threshold=') || a.startsWith('-t='));
    if (thresholdArg) {
        threshold = parseInt(thresholdArg.split('=')[1], 10) || 100;
    }

    return {
        simDir: args[0] || '',
        verbose: args.includes('--verbose') || args.includes('-v'),
        json: args.includes('--json') || args.includes('-j'),
        threshold,
        help: args.includes('--help') || args.includes('-h'),
    };
}

function printHelp() {
    console.log(`
Использование: npm run sim:compare <sim-dir> [options]

Параметры:
  <sim-dir>          Директория симуляции (обязательно)
  --verbose, -v     Подробный вывод
  --json, -j        Вывод в формате JSON
  --threshold, -t  Минимальный порог совпадения (по умолчанию 100)
  --help, -h        Показать эту справку

Примеры:
  npm run sim:compare fix-vue-imports
  npm run sim:compare fix-vue-imports -- --verbose
  npm run sim:compare fix-vue-imports -- --json
  npm run sim:compare fix-vue-imports -- --threshold=80
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
        console.error('   Использование: npm run sim:compare <sim-dir>');
        console.error('   Пример: npm run sim:compare fix-vue-imports');
        console.error('\nДля справки: npm run sim:compare -- --help');
        process.exit(1);
    }

    const baseDir = join(__dirname, '..', '..', 'simulations');
    const simDir = join(baseDir, cliArgs.simDir);
    const goldStandardPath = join(simDir, 'response.json');
    const invokeCapturePath = join(simDir, 'invoke-capture.json');
    const legacyCapturePath = join(simDir, 'server-response.json');

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

    if (!existsSync(goldStandardPath)) {
        const errorMsg = `❌ Gold standard (response.json) не найден`;
        if (cliArgs.json) {
            console.log(JSON.stringify({valid: false, error: errorMsg}, null, 2));
        } else {
            console.error(errorMsg);
        }
        process.exit(1);
    }

    const capturePath = existsSync(invokeCapturePath)
        ? invokeCapturePath
        : existsSync(legacyCapturePath)
          ? legacyCapturePath
          : null;
    if (!capturePath) {
        const errorMsg = '❌ invoke-capture.json не найден (запустите npm run sim:run …)';
        if (cliArgs.json) {
            console.log(JSON.stringify({valid: false, error: errorMsg}, null, 2));
        } else {
            console.error(errorMsg);
            console.error(`   Сначала запустите симуляцию: npm run sim:run ${cliArgs.simDir}`);
        }
        process.exit(1);
    }

    let goldStandard: any;
    let serverResponse: any;

    try {
        goldStandard = JSON.parse(readFileSync(goldStandardPath, 'utf-8'));
    } catch (err: any) {
        const errorMsg = `Ошибка чтения gold standard: ${err.message}`;
        if (cliArgs.json) {
            console.log(JSON.stringify({valid: false, error: errorMsg}, null, 2));
        } else {
            console.error(`❌ ${errorMsg}`);
        }
        process.exit(1);
    }

    try {
        serverResponse = JSON.parse(readFileSync(capturePath, 'utf-8'));
    } catch (err: any) {
        const errorMsg = `Ошибка чтения server-response: ${err.message}`;
        if (cliArgs.json) {
            console.log(JSON.stringify({valid: false, error: errorMsg}, null, 2));
        } else {
            console.error(`❌ ${errorMsg}`);
        }
        process.exit(1);
    }

    const serverData = extractServerData(serverResponse);
    const goldData = extractGoldData(goldStandard);

    const structuralValidation = validateStructure(serverData);
    const result = deepCompare(serverData, goldData);
    result.structuralValid = structuralValidation.valid;
    result.structuralErrors = structuralValidation.errors;

    const mismatches = result.differences.filter(d => d.type === 'mismatch');
    const missing = result.differences.filter(d => d.type === 'missing');
    const extra = result.differences.filter(d => d.type === 'extra');

    const passesThreshold = result.similarity >= cliArgs.threshold;
    const passesComparison = passesThreshold && result.differences.length === 0;

    if (cliArgs.json) {
        const output: any = {
            simulation: cliArgs.simDir,
            similarity: result.similarity,
            threshold: cliArgs.threshold,
            passes: passesComparison,
            structuralValid: result.structuralValid,
        };

        if (result.differences.length > 0) {
            output.differences = result.differences;
        }

        if (result.structuralErrors.length > 0) {
            output.structuralErrors = result.structuralErrors;
        }

        console.log(JSON.stringify(output, null, 2));
    } else {
        console.log(`\n📁 Сравнение симуляции: ${cliArgs.simDir}`);
        console.log(`   Path: ${simDir}`);
        console.log('');

        const scoreEmoji = result.similarity >= 90 ? '🟢' : result.similarity >= 70 ? '🟡' : '🔴';
        console.log(`${scoreEmoji} Similarity: ${result.similarity}% (threshold: ${cliArgs.threshold}%)`);

        if (result.structuralValid) {
            console.log('✅ Структурная валидация пройдена');
        } else {
            console.log('❌ Структурная валидация провалена');
            if (cliArgs.verbose && result.structuralErrors.length > 0) {
                result.structuralErrors.forEach(err => console.log(`   - ${err}`));
            }
        }

        console.log('');

        if (passesComparison) {
            console.log('✅ Gold standard совпадает полностью!');
        } else {
            console.log(`🔴 Найдено ${result.differences.length} различий:\n`);

            if (mismatches.length > 0) {
                console.log('🔴 Различия в значениях:');
                mismatches.forEach(diff => {
                    console.log(`   - ${diff.path}: ${JSON.stringify(diff.actual)} ≠ ${JSON.stringify(diff.expected)}`);
                });
                console.log('');
            }

            if (missing.length > 0) {
                console.log('🟡 Отсутствует в server-response:');
                missing.forEach(diff => console.log(`   - ${diff.path}`));
                console.log('');
            }

            if (extra.length > 0) {
                console.log('🟢 Дополнительные поля в server-response:');
                extra.forEach(diff => console.log(`   - ${diff.path}`));
                console.log('');
            }

            if (cliArgs.verbose && !result.structuralValid) {
                console.log('⚠️ Ошибки структурной валидации:');
                result.structuralErrors.forEach(err => console.log(`   - ${err}`));
                console.log('');
            }
        }
    }

    process.exit(passesComparison && result.structuralValid ? 0 : 1);
}

main();
