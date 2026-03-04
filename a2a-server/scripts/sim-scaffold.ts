#!/usr/bin/env tsx

/**
 * CLI для создания новых симуляций
 *
 * Использование:
 *   npm run sim:create <simulation-name> [options]
 *
 * Опции:
 *   --name <name>        Имя симуляции (kebab-case)
 *   --type <type>        Тип: actions | ai-actions
 *   --steps <n>          Количество шагов (по умолчанию: 1)
 *   --with-transforms    Добавить server-transforms файлы
 *   --force              Перезаписать существующие файлы
 *   --help, -h           Показать справку
 *
 * Примеры:
 *   npm run sim:create -- --name my-new-simulation
 *   npm run sim:create -- --name my-new-simulation --type actions --steps 3
 *   npm run sim:create -- --name complex-flow --type ai-actions --steps 5 --with-transforms
 */

import {mkdirSync, existsSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Константы
// ============================================

const SIMULATIONS_DIR = join(__dirname, '..', '..', 'simulations');

// ============================================
// Типы
// ============================================

interface CliArgs {
    name: string | null;
    type: 'actions' | 'ai-actions';
    steps: number;
    withTransforms: boolean;
    force: boolean;
    help: boolean;
}

// ============================================
// Шаблоны
// ============================================

function getDescriptionTemplate(name: string, type: string, steps: number): string {
    const typeLabel = type === 'actions' ? 'Actions' : 'AI-Actions';
    
    return `# ${toTitleCase(name.replace(/-/g, ' '))} Simulation

## Тип: ${typeLabel}

Это симуляция типа **${typeLabel}** - ${type === 'actions' 
    ? 'с захардкоженными шагами, которые сервер переключает автоматически на основе результатов выполнения.'
    : 'с динамическими шагами, где LLM выбирает следующее действие.'}.

## Описание

Опишите здесь назначение этой симуляции.

## Поток

${type === 'actions' 
    ? `| Крок | Internal Step    | Клієнт виконує              |
|------|------------------|----------------------------|
| 1    | step-name       | действие клиента            |
${steps > 1 ? `| ...  | ...             | ...                        |
| ${steps}   | completion       | завершение                  ` : ''}`
    : '| Шаг  | LLM выбирает следующее действие |'
}

## Особенности

${type === 'actions' 
    ? `- **step в execution** - сервер автоматически изменяет \`step\` на основе \`result\`
- **Захардкоженные шаги** - все шаги определены заранее в action definition
- **Server-driven** - сервер решает какой следующий шаг выполнить`
    : `- **LLM-driven** - LLM выбирает следующий шаг из доступных
- **Динамический поток** - шаги могут меняться в зависимости от контекста
- **AI-Actions** - доступны для выбора пользователем`
}

## Структура файлов

\`\`\`
simulations/${name}/
├── description.md
├── analysis.md
${Array.from({length: steps}, (_, i) => `├── ${i + 1}/ request.json${i === 0 ? ', response.json' : ''}${i === 0 && i < steps - 1 ? ', server-transforms-*.json' : ''}`).join('\n')}
└── ${steps}/ response.json
\`\`\`
`;
}

function getAnalysisTemplate(name: string): string {
    return `# Analysis: ${toTitleCase(name.replace(/-/g, ' '))}

## Проблема

Опишите проблему, которую решает эта симуляция.

## Решение

Опишите подход к решению.

## Тестовые данные

- Опишите тестовые данные, используемые в симуляции
- Файлы, команды, ожидаемые результаты

## Метрики успеха

- [ ] Определите критерии успеха
- [ ] Добавьте дополнительные критерии
`;
}

function getFirstRequestTemplate(task: string): string {
    return JSON.stringify({
        task: task || 'описание задачи'
    }, null, 2);
}

function getFirstResponseTemplate(type: string, actionId?: string): string {
    const actionName = actionId || 'action-id';
    
    // Используем execute.form.choices вместо устаревшего actions[]/aiActions[]
    if (type === 'actions') {
        return JSON.stringify({
            context: {
                task: 'описание задачи'
            },
            execute: {
                form: {
                    title: 'Оберіть спосіб виконання',
                    choices: [
                        {
                            id: actionName,
                            label: toTitleCase(actionName.replace(/-/g, ' '))
                        },
                        {
                            id: 'auto-ai',
                            label: 'AI Action Generator — згенерувати екшен за допомогою LLM'
                        },
                        {
                            id: 'task-decomposition',
                            label: 'Декомпозиція задачі вручну'
                        }
                    ]
                }
            }
        }, null, 2);
    } else {
        // AI-Actions
        return JSON.stringify({
            context: {
                task: 'описание задачи'
            },
            execute: {
                form: {
                    title: 'Оберіть спосіб виконання',
                    choices: [
                        {
                            id: actionName,
                            label: toTitleCase(actionName.replace(/-/g, ' '))
                        },
                        {
                            id: 'auto-ai',
                            label: 'AI Action Generator'
                        },
                        {
                            id: 'task-decomposition',
                            label: 'Декомпозиція задачі'
                        }
                    ]
                }
            }
        }, null, 2);
    }
}

function getStepRequestTemplate(hasContext: boolean, actionName?: string): string {
    const action = actionName || 'action-id';
    const base: Record<string, any> = {};
    
    if (hasContext) {
        base.context = {
            task: 'описание задачи',
            execution: {
                action: action,
                step: 'previous-step-name'
            }
        };
    }

    // Используем action-key shape для result
    base.result = {
        [action]: {
            success: true,
            message: 'Результат выполнения предыдущего шага'
        }
    };

    return JSON.stringify(base, null, 2);
}

function getStepResponseTemplate(hasMoreSteps: boolean, actionName?: string): string {
    const action = actionName || 'action-id';
    const base = {
        context: {
            task: 'описание задачи',
            execution: {
                action: action,
                step: 'step-name'
            }
        }
    };

    if (hasMoreSteps) {
        // Следующий шаг - используем execute с типом действия (action-key shape)
        return JSON.stringify({
            ...base,
            execute: {
                script: {
                    input: {
                        param1: 'value1'
                    },
                    output: 'result',
                    code: '// Описание DSL скрипта для выполнения'
                }
            }
        }, null, 2);
    } else {
        // Завершающий шаг - используем form с choices для завершения
        return JSON.stringify({
            ...base,
            execute: {
                form: {
                    title: 'Готово',
                    choices: [
                        {id: 'done', label: 'OK'}
                    ]
                }
            },
            result: {
                completed: true
            }
        }, null, 2);
    }
}

function getTransformRequestTemplate(): string {
    return JSON.stringify({
        description: 'Опишите трансформацию request.json перед отправкой в LLM',
        operations: [
            {
                type: 'set',
                path: '$.prompt',
                value: 'Сгенерированный промпт для LLM'
            }
        ]
    }, null, 2);
}

function getTransformResponseTemplate(): string {
    return JSON.stringify({
        description: 'Опишите трансформацию ответа LLM перед отправкой клиенту',
        operations: [
            {
                type: 'set',
                path: '$.execute',
                value: 'Структура execute для клиента'
            }
        ]
    }, null, 2);
}

// ============================================
// Утилиты
// ============================================

function dirname(path: string): string {
    return path.replace(/[/\\][^/\\]*$/, '');
}

function toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function isKebabCase(str: string): boolean {
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
}

function createDirectory(dir: string): void {
    if (!existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
        console.log(`✅ Created: ${dir}`);
    } else {
        console.log(`📁 Exists: ${dir}`);
    }
}

function writeFile(file: string, content: string, force: boolean): void {
    if (existsSync(file) && !force) {
        console.log(`⚠️  Skipped (exists): ${file}`);
        return;
    }
    writeFileSync(file, content, 'utf-8');
    console.log(`✅ Created: ${file}`);
}

// ============================================
// CLI
// ============================================

function parseArgs(): CliArgs {
    const args = process.argv.slice(2);

    let name: string | null = null;
    let type: 'actions' | 'ai-actions' = 'actions';
    let steps = 1;
    let withTransforms = false;
    let force = false;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        if ((arg === '--name' || arg === '-n') && i + 1 < args.length) {
            name = args[i + 1];
            i++;
        } else if (arg === '--type' && i + 1 < args.length) {
            const t = args[i + 1].toLowerCase();
            if (t === 'actions' || t === 'ai-actions') {
                type = t;
            }
            i++;
        } else if ((arg === '--steps' || arg === '-s') && i + 1 < args.length) {
            steps = parseInt(args[i + 1]) || 1;
            i++;
        } else if (arg === '--with-transforms' || arg === '-t') {
            withTransforms = true;
        } else if (arg === '--force' || arg === '-f') {
            force = true;
        }
    }

    return {
        name,
        type,
        steps,
        withTransforms,
        force,
        help: args.includes('--help') || args.includes('-h')
    };
}

function printHelp() {
    console.log(`
🛠️  Simulation Scaffold Generator

Использование: npm run sim:create [options]

Опции:
  --name <name>, -n       Имя симуляции (kebab-case)
  --type <type>, -t      Тип: actions | ai-actions (по умолчанию: actions)
  --steps <n>, -s         Количество шагов (по умолчанию: 1)
  --with-transforms      Добавить server-transforms файлы
  --force, -f            Перезаписать существующие файлы
  --help, -h             Показать эту справку

Примеры:
  npm run sim:create -- --name my-new-simulation
  npm run sim:create -- --name complex-workflow --type ai-actions --steps 5
  npm run sim:create -- --name debug-flow --with-transforms --force
`);
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

    if (!args.name) {
        console.error('❌ Ошибка: укажите имя симуляции');
        console.error('   Использование: npm run sim:create -- --name <name>');
        console.error('   Пример: npm run sim:create -- --name my-simulation');
        console.error('   Для справки: npm run sim:create -- --help');
        process.exit(1);
    }

    // Валидация имени
    if (!isKebabCase(args.name)) {
        console.error(`❌ Ошибка: имя должно быть в kebab-case (например: 'my-simulation', а не '${args.name}')`);
        process.exit(1);
    }

    const simPath = join(SIMULATIONS_DIR, args.name);

    console.log(`\n📦 Creating simulation: ${args.name}`);
    console.log(`   Type: ${args.type}`);
    console.log(`   Steps: ${args.steps}\n`);

    // Создаем директорию симуляции
    createDirectory(simPath);

    // Создаем description.md
    writeFile(
        join(simPath, 'description.md'),
        getDescriptionTemplate(args.name, args.type, args.steps),
        args.force
    );

    // Создаем analysis.md
    writeFile(
        join(simPath, 'analysis.md'),
        getAnalysisTemplate(args.name),
        args.force
    );

    // Создаем шаги
    for (let i = 1; i <= args.steps; i++) {
        const stepPath = join(simPath, String(i));
        createDirectory(stepPath);

        // request.json
        const isFirst = i === 1;
        const isLast = i === args.steps;
        const actionName = args.name;
        
        if (isFirst) {
            // Первый шаг - только task
            writeFile(
                join(stepPath, 'request.json'),
                getFirstRequestTemplate('описание задачи'),
                args.force
            );
        } else {
            // Последующие шаги - context + result (action-key shape)
            writeFile(
                join(stepPath, 'request.json'),
                getStepRequestTemplate(true, actionName),
                args.force
            );
        }

        // response.json
        const hasMoreSteps = !isLast;
        
        if (isFirst) {
            // Первый ответ - execute.form.choices
            writeFile(
                join(stepPath, 'response.json'),
                getFirstResponseTemplate(args.type, actionName),
                args.force
            );
        } else {
            // Последующие ответы - execute с типом действия
            writeFile(
                join(stepPath, 'response.json'),
                getStepResponseTemplate(hasMoreSteps, actionName),
                args.force
            );
        }

        // server-transforms файлы (опционально)
        if (args.withTransforms && isFirst) {
            writeFile(
                join(stepPath, 'server-transforms-request.json'),
                getTransformRequestTemplate(),
                args.force
            );
            writeFile(
                join(stepPath, 'server-transforms-response.json'),
                getTransformResponseTemplate(),
                args.force
            );
        }
    }

    console.log(`\n✅ Simulation '${args.name}' created successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  1. Edit description.md with detailed description`);
    console.log(`  2. Edit analysis.md with analysis`);
    console.log(`  3. Update request.json and response.json files`);
    console.log(`  4. Run: npm run sim:lint -- --sim ${args.name}`);
    console.log(`  5. Validate: npm run sim:validate -- --sim ${args.name}\n`);
}

main();
