#!/usr/bin/env tsx

/**
 * Скрипт для создания новой симуляции
 *
 * Использование:
 *   npm run sim:create <action-name>
 *
 * Пример:
 *   npm run sim:create fix-vue-imports
 *
 * Результат:
 *   - Создает папку simulations/<action-name>/
 *   - Генерирует request.json, response.json, description.md, NOTES.md
 */

import {mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';

const actionName = process.argv[2];

if (!actionName) {
    console.error('❌ Usage: npm run sim:create <action-name>');
    console.error('   Example: npm run sim:create fix-vue-imports');
    process.exit(1);
}

// Валидация имени
const validNameRegex = /^[a-z0-9-]+$/;
if (!validNameRegex.test(actionName)) {
    console.error('❌ Invalid action name. Use lowercase letters, numbers, and hyphens only.');
    process.exit(1);
}

const simDir = join(__dirname, '..', 'simulations', actionName);

// Проверка существования
if (existsSync(simDir)) {
    console.error(`❌ Simulation already exists: ${simDir}`);
    console.error('   Use a different name or remove existing simulation.');
    process.exit(1);
}

// Создаем директорию
mkdirSync(simDir, {recursive: true});
console.log(`\n✅ Created directory: ${simDir}`);

// Шаблон request.json
const requestTemplate = {
    action: actionName,
    context: {
        version: '1.0',
        session_id: `sim-${actionName}-001`,
        task: `Выполни экшен ${actionName}`,
        workspace: {
            root: '/test/project',
            files: []
        }
    }
};

// Шаблон response.json (gold standard)
const responseTemplate = {
    sessionId: `sim-${actionName}-001`,
    response: {
        type: 'action_proposal',
        proposedActions: [
            {
                id: actionName,
                name: actionName,
                description: `Выполнение экшена ${actionName}`
            }
        ],
        execution: {
            history: [],
            executingAction: null,
            currentStep: 0
        }
    },
    nextSteps: [
        {
            type: 'approve_action',
            description: 'Выберите действие для выполнения'
        }
    ]
};

// Шаблон description.md
const descriptionTemplate = `# Симуляция: ${actionName}

## Описание

Описание тестируемого сценария для экшена \`${actionName}\`.

## Входные данные

- **action:** ${actionName}
- **task:** Описание задачи
- **workspace:** Тестовый проект

## Ожидаемое поведение

1. Сервер предлагает корректное действие
2. Структура ответа соответствует схеме
3. Выполняются все sub-actions

## Критерии успеха

- [ ] Корректный response.type = action_proposal
- [ ] proposedActions содержит нужный экшен
- [ ] execution.history = []
- [ ] nextSteps содержит approve_action
`;

// Шаблон NOTES.md
const notesTemplate = `# Заметки по симуляции ${actionName}

## Дата: ${new Date().toISOString().split('T')[0]}

### Результат: ⬜ Ожидает запуска

### Отклонения от gold standard:
-

### Тестируемые сценарии:
1. 

### Известные проблемы:
- 

---

## История запусков

| Дата | Статус | Время | Примечания |
|------|--------|-------|------------|
| - | - | - | - |
`;

// Записываем файлы
writeFileSync(
    join(simDir, 'request.json'),
    JSON.stringify(requestTemplate, null, 2)
);
console.log('✅ Created: request.json');

writeFileSync(
    join(simDir, 'response.json'),
    JSON.stringify(responseTemplate, null, 2)
);
console.log('✅ Created: response.json (gold standard)');

writeFileSync(
    join(simDir, 'description.md'),
    descriptionTemplate
);
console.log('✅ Created: description.md');

writeFileSync(
    join(simDir, 'NOTES.md'),
    notesTemplate
);
console.log('✅ Created: NOTES.md');

console.log(`
\n🎉 Симуляция создана: ${actionName}

Структура:
${simDir}/
├── request.json      # Запрос клиента
├── response.json     # Ожидаемый ответ (gold standard)
├── description.md    # Описание сценария
└── NOTES.md         # Заметки по результатам

Следующие шаги:
1. Отредактируйте request.json с реальными данными
2. Запустите симуляцию: npm run sim:run ${actionName}
3. Проверьте результат и обновите response.json если нужно
`);
