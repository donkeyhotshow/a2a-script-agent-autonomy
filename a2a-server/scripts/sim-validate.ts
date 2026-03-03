#!/usr/bin/env tsx

/**
 * CLI для валиляций и схдации симуем протокола
 *
 * Использование:
 *   npm run sim:validate <sim-dir> [options]
 *   npm run sim:validate --all [options]
 *
 * Опции:
 *   --sim <name>       Имя симуляции для валидации
 *   --all              Валидировать все симуляции
 *   --json             Вывод в формате JSON
 *   --verbose, -v      Подробный вывод
 *   --help, -h         Показать справку
 *
 * Примеры:
 *   npm run sim:validate -- --sim coder/3
 *   npm run sim:validate -- --all --verbose
 *   npm run sim:validate -- --sim coder/3 --json
 */

import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import Ajv, {ErrorObject} from 'ajv';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Константы
// ============================================

const SCHEMAS_DIR = join(__dirname, '..', '..', 'docs', 'new-request-flow', 'json-schemas');
const SIMULATIONS_DIR = join(__dirname, '..', '..', 'simulations');

// AJV instance with 2020-12 support
const ajv = new Ajv({
    allErrors: true,
    verbose: true,
    strict: false,
    validateFormats: false
});

// Add formats support
addFormats(ajv);

// ============================================
// Типы
// ============================================

interface ValidationError {
    path: string;
    message: string;
    keyword: string;
}

interface FileValidationResult {
    file: string;
    valid: boolean;
    errors: ValidationError[];
    warnings: string[];
}

interface SimulationValidationResult {
    name: string;
    path: string;
    valid: boolean;
    files: FileValidationResult[];
    errors: ValidationError[];
    warnings: string[];
}

interface CliArgs {
    sim: string | null;
    all: boolean;
    json: boolean;
    verbose: boolean;
    help: boolean;
}

// ============================================
// Загрузка схем
// ============================================

interface SchemaCache {
    [key: string]: object;
}

const schemaCache: SchemaCache = {};

function loadSchema(schemaName: string): object | null {
    if (schemaCache[schemaName]) {
        return schemaCache[schemaName];
    }

    const schemaPath = join(SCHEMAS_DIR, schemaName);
    if (!existsSync(schemaPath)) {
        console.error(`⚠️  Схема не найдена: ${schemaName}`);
        return null;
    }

    try {
        const content = readFileSync(schemaPath, 'utf-8');
        const schema = JSON.parse(content);
        schemaCache[schemaName] = schema;
        return schema;
    } catch (err: any) {
        console.error(`⚠️  Ошибка загрузки схемы ${schemaName}: ${err.message}`);
        return null;
    }
}

// ============================================
// Валидация JSON по схеме
// ============================================

function validateJsonAgainstSchema(data: any, schemaName: string): {valid: boolean; errors: ValidationError[]} {
    const schema = loadSchema(schemaName);
    if (!schema) {
        return {
            valid: false,
            errors: [{path: '', message: `Схема не найдена: ${schemaName}`, keyword: 'schema'}]
        };
    }

    const validate = ajv.compile(schema);
    const valid = validate(data);

    if (valid) {
        return {valid: true, errors: []};
    }

    const errors: ValidationError[] = (validate.errors || []).map((err: ErrorObject) => ({
        path: err.instancePath || '/',
        message: err.message || 'Unknown error',
        keyword: err.keyword
    }));

    return {valid: false, errors};
}

// ============================================
// Определение типа файла и выбор схемы
// ============================================

interface FileTypeConfig {
    schema: string | null;
    required: boolean;
}

const FILE_TYPE_CONFIGS: {[key: string]: FileTypeConfig} = {
    'request.json': {schema: 'server-invoke-request.schema.json', required: true},
    'response.json': {schema: 'server-invoke-response-execute.schema.json', required: true},
    'server-transforms-request.json': {schema: 'server-transform.schema.json', required: false},
    'server-transforms-response.json': {schema: 'server-transform.schema.json', required: false},
};

function detectFileType(filename: string): FileTypeConfig | null {
    return FILE_TYPE_CONFIGS[filename] || null;
}

// ============================================
// Валидация файла
// ============================================

function validateFile(filePath: string, filename: string): FileValidationResult {
    const result: FileValidationResult = {
        file: filename,
        valid: true,
        errors: [],
        warnings: []
    };

    // Проверка существования файла
    if (!existsSync(filePath)) {
        const fileConfig = detectFileType(filename);
        if (fileConfig?.required) {
            result.valid = false;
            result.errors.push({
                path: '',
                message: `Required file not found: ${filename}`,
                keyword: 'required'
            });
        } else {
            result.warnings.push(`Optional file not found: ${filename}`);
        }
        return result;
    }

    // Чтение и парсинг JSON
    let data: any;
    try {
        const content = readFileSync(filePath, 'utf-8');
        data = JSON.parse(content);
    } catch (err: any) {
        result.valid = false;
        result.errors.push({
            path: '',
            message: `Invalid JSON: ${err.message}`,
            keyword: 'parse'
        });
        return result;
    }

    // Определение типа файла и валидация
    const fileConfig = detectFileType(filename);
    if (fileConfig?.schema) {
        const validationResult = validateJsonAgainstSchema(data, fileConfig.schema);
        result.valid = validationResult.valid;
        result.errors = validationResult.errors;
    } else {
        result.warnings.push(`No schema defined for: ${filename}`);
    }

    return result;
}

// ============================================
// Валидация симуляции
// ============================================

function validateSimulation(simPath: string, simName: string): SimulationValidationResult {
    const result: SimulationValidationResult = {
        name: simName,
        path: simPath,
        valid: true,
        files: [],
        errors: [],
        warnings: []
    };

    // Проверка существования директории
    if (!existsSync(simPath)) {
        result.valid = false;
        result.errors.push({
            path: '',
            message: `Simulation directory not found: ${simName}`,
            keyword: 'directory'
        });
        return result;
    }

    // Валидация каждого файла
    const requiredFiles = ['request.json', 'response.json'];
    const optionalFiles = ['server-transforms-request.json', 'server-transforms-response.json'];
    const allFiles = [...requiredFiles, ...optionalFiles];

    for (const filename of allFiles) {
        const filePath = join(simPath, filename);
        const fileResult = validateFile(filePath, filename);
        result.files.push(fileResult);

        if (!fileResult.valid) {
            result.valid = false;
            result.errors.push(...fileResult.errors.map(e => ({
                ...e,
                path: `${filename}${e.path}`
            })));
        }

        result.warnings.push(...fileResult.warnings.map(w => `${filename}: ${w}`));
    }

    return result;
}

// ============================================
// Получение списка всех симуляций
// ============================================

function getAllSimulations(): {path: string; name: string}[] {
    const simulations: {path: string; name: string}[] = [];

    if (!existsSync(SIMULATIONS_DIR)) {
        return simulations;
    }

    const entries = readdirSync(SIMULATIONS_DIR, {withFileTypes: true});

    for (const entry of entries) {
        if (entry.isDirectory()) {
            // Проверяем поддиректории (например, coder/3)
            const subDir = join(SIMULATIONS_DIR, entry.name);
            const subEntries = readdirSync(subDir, {withFileTypes: true});

            for (const subEntry of subEntries) {
                if (subEntry.isDirectory()) {
                    simulations.push({
                        path: join(subDir, subEntry.name),
                        name: `${entry.name}/${subEntry.name}`
                    });
                }
            }

            // Также добавляем директории верхнего уровня если в них есть JSON файлы
            const mainSimPath = join(SIMULATIONS_DIR, entry.name);
            if (existsSync(join(mainSimPath, 'request.json'))) {
                simulations.push({
                    path: mainSimPath,
                    name: entry.name
                });
            }
        }
    }

    return simulations;
}

// ============================================
// CLI интерфейс
// ============================================

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);

    let sim: string | null = null;
    let all = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === '--sim' && i + 1 < args.length) {
            sim = args[i + 1];
            i++;
        } else if (arg === '--all') {
            all = true;
        }
    }

    return {
        sim,
        all,
        json: args.includes('--json') || args.includes('-j'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        help: args.includes('--help') || args.includes('-h'),
    };
}

function printHelp() {
    console.log(`
🛠️  Simulation & Schema Validator CLI

Использование: npm run sim:validate [options]

Опции:
  --sim <name>       Имя симуляции для валидации (например: coder/3, fix-vue-imports)
  --all              Валидировать все симуляции
  --json, -j         Вывод в формате JSON
  --verbose, -v      Подробный вывод
  --help, -h         Показать эту справку

Примеры:
  npm run sim:validate -- --sim coder/3
  npm run sim:validate -- --all --verbose
  npm run sim:validate -- --sim fix-vue-imports --json

Валидируемые файлы:
  - request.json              → server-invoke-request.schema.json
  - response.json             → server-invoke-response-execute.schema.json
  - server-transforms-*.json  → server-transform.schema.json
`);
}

// ============================================
// Форматирование вывода
// ============================================

function formatResults(results: SimulationValidationResult[], json: boolean, verbose: boolean): void {
    if (json) {
        const output = {
            valid: results.every(r => r.valid),
            simulations: results.map(r => ({
                name: r.name,
                valid: r.valid,
                errors: r.errors,
                warnings: verbose ? r.warnings : undefined,
                files: r.files.map(f => ({
                    file: f.file,
                    valid: f.valid,
                    errors: f.errors
                }))
            }))
        };
        console.log(JSON.stringify(output, null, 2));
        return;
    }

    // Текстовый вывод
    console.log('\n📋 Результаты валидации симуляций:\n');

    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
        const status = result.valid ? '✅' : '❌';
        console.log(`${status} ${result.name}`);
        console.log(`   Путь: ${result.path}`);

        if (result.errors.length > 0) {
            console.log(`   Ошибки (${result.errors.length}):`);
            result.errors.forEach(err => {
                const path = err.path ? `[${err.path}] ` : '';
                console.log(`     - ${path}${err.message}`);
                totalErrors++;
            });
        }

        if (verbose && result.warnings.length > 0) {
            console.log(`   Предупреждения (${result.warnings.length}):`);
            result.warnings.forEach(w => {
                console.log(`     - ${w}`);
                totalWarnings++;
            });
        }

        if (verbose) {
            console.log(`   Файлы:`);
            for (const file of result.files) {
                const fileStatus = file.valid ? '✅' : '❌';
                console.log(`     ${fileStatus} ${file.file}`);
                if (!file.valid && file.errors.length > 0) {
                    file.errors.forEach(err => {
                        console.log(`       - ${err.message}`);
                    });
                }
            }
        }

        console.log('');
    }

    // Итоговая статистика
    const allValid = results.every(r => r.valid);
    const symbol = allValid ? '✅' : '❌';

    console.log('─────────────────────────────────────────');
    console.log(`${symbol} Итого: ${results.length} симуляций`);

    if (!allValid || totalErrors > 0) {
        console.log(`   ❌ Ошибок: ${totalErrors}`);
    }

    if (verbose && totalWarnings > 0) {
        console.log(`   ⚠️  Предупреждений: ${totalWarnings}`);
    }
}

// ============================================
// Основная функция
// ============================================

function main() {
    const args = parseArgs();

    if (args.help) {
        printHelp();
        process.exit(0);
    }

    if (!args.sim && !args.all) {
        console.error('❌ Ошибка: укажите симуляцию или используйте --all');
        console.error('   Использование: npm run sim:validate -- --sim <name>');
        console.error('   Пример: npm run sim:validate -- --sim coder/3');
        console.error('   Для справки: npm run sim:validate -- --help');
        process.exit(1);
    }

    const results: SimulationValidationResult[] = [];

    if (args.all) {
        // Валидация всех симуляций
        const simulations = getAllSimulations();

        if (simulations.length === 0) {
            console.log('⚠️  Симуляции не найдены');
            process.exit(0);
        }

        console.log(`📂 Найдено симуляций: ${simulations.length}\n`);

        for (const sim of simulations) {
            const result = validateSimulation(sim.path, sim.name);
            results.push(result);
        }
    } else if (args.sim) {
        // Валидация конкретной симуляции
        const simPath = join(SIMULATIONS_DIR, args.sim);
        const result = validateSimulation(simPath, args.sim);
        results.push(result);
    }

    // Форматирование и вывод результатов
    formatResults(results, args.json, args.verbose);

    // Выход с ненулевым статусом при ошибках
    const hasErrors = results.some(r => !r.valid);
    process.exit(hasErrors ? 1 : 0);
}

main();
