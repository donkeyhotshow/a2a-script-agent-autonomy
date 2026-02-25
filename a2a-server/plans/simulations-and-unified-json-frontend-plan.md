# План: Симуляции и Унифицированный JSON Frontend Фреймворк

**Версия:** 1.0  
**Дата:** 2026-02-25  
**Статус:** В работе

---

## Содержание

1. [Раздел документации](#раздел-документации)
2. [План симуляций для реальных экшенов](#план-симуляций-для-реальных-экшенов)
   - [Структура симуляции](#структура-симуляции-для-реального-экшена)
   - [Детальная методология](#детальная-методология-создания-симуляций)
3. [План унифицированного JSON frontend фреймворка](#план-унифицированного-json-frontend-фреймворка)

---

## Раздел документации

### Что было сделано

В ходе работы над симуляционным фреймворком a2a-server были выполнены следующие исправления:

#### 1. Исправление обработчика `task_request`

- **Проблема:** Обработчик некорректно формировал ответ с `proposedActions`
- **Решение:** Обновлена логика в `RequestProcessorService` для правильного построения контекста с предложениями действий
- **Файлы:** [`a2a-server/src/services/request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts)

#### 2. Исправление обработчика `approve_action`

- **Проблема:** При выборе действия сервер не инициализировал выполнение sub-actions
- **Решение:** Добавлена инициализация `execution.history` и `executingAction` в контекст ответа
- **Файлы:** [`a2a-server/src/services/request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts)

#### 3. Исправление обработчика `step_result`

- **Проблема:** Сервер не обновлял прогресс и не переходил к следующим шагам
- **Решение:** Реализована логика обновления `progress` и генерации `nextSteps` на основе результатов шага
- **Файлы:** [`a2a-server/src/services/request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts)

#### 4. Успешное прохождение всех 5 симуляций pilot

| Симуляция | Тип | Статус |
|-----------|-----|--------|
| 1 | action_proposal | ✅ Пройдено |
| 2 | action_executing (start) | ✅ Пройдено |
| 3 | action_executing (detect) | ✅ Пройдено |
| 4 | action_executing (resolve) | ✅ Пройдено |
| 5 | action_complete | ✅ Пройдено |

#### 5. Добавление схем для валидации ответов

Создан файл [`simulations/pilot/schemas.ts`](simulations/pilot/schemas.ts) с типами:

- `actionProposalSchema` - валидация предложения действий
- `actionExecutingStartSchema` - валидация начала выполнения
- `actionExecutingStepSchema` - валидация промежуточных шагов
- `actionExecutingDetectSchema` - валидация шага обнаружения
- `actionExecutingResolveSchema` - валидация шага разрешения
- `actionCompleteSchema` - валидация завершения

**Обозначения в схемах:**
- `STATIC` - фиксированное значение
- `DYNAMIC` - изменяемое значение
- `OPTIONAL` - может отсутствовать

---

## План симуляций для реальных экшенов

### Обзор

На основе анализа экшенов в [`a2a-server/src/actions/definitions/`](a2a-server/src/actions/definitions/) определены категории для создания симуляций.

### Категории экшенов

#### 1. Analysis (Анализ кода)

| Экшен | Описание | Приоритет |
|-------|----------|-----------|
| `analyze-full` | Полный анализ кодовой базы | Высокий |
| `analyze-architecture` | Анализ архитектуры проекта | Высокий |
| `analyze-typescript` | Анализ TypeScript кода | Средний |
| `analyze-vue` | Анализ Vue компонентов | Средний |
| `analyze-laravel` | Анализ Laravel приложения | Средний |
| `analyze-security` | Анализ безопасности | Высокий |
| `analyze-performance` | Анализ производительности | Средний |
| `analyze-test` | Анализ покрытия тестами | Низкий |
| `phpunit-deprecations` | Поиск deprecated API PHPUnit | Средний |

#### 2. Generation (Генерация кода)

| Экшен | Описание | Приоритет |
|-------|----------|-----------|
| `generate-crud` | Генерация CRUD операций | Высокий |
| `generate-controller` | Генерация контроллера | Высокий |
| `generate-model` | Генерация модели | Высокий |
| `generate-migration` | Генерация миграции | Высокий |
| `generate-view` | Генерация представления | Средний |
| `generate-method` | Генерация метода | Средний |
| `generate-test` | Генерация теста | Средний |

#### 3. Graph (Граф знаний)

| Экшен | Описание | Приоритет |
|-------|----------|-----------|
| `graph-build` | Построение графа зависимостей | Высокий |
| `graph-extract-entities` | Извлечение сущностей | Средний |
| `graph-extract-relations` | Извлечение связей | Средний |
| `graph-query` | Запросы к графу | Средний |
| `graph-impact` | Анализ влияния изменений | Высокий |
| `graph-visualize` | Визуализация графа | Низкий |

#### 4. Hybrid (Гибридные операции)

| Экшен | Описание | Приоритет |
|-------|----------|-----------|
| `hybrid-fix` | Автоматическое исправление проблем | Высокий |
| `hybrid-refactor` | Рефакторинг кода | Высокий |
| `hybrid-improve` | Улучшение кода | Средний |
| `hybrid-explain` | Объяснение кода | Средний |

#### 5. Context (Работа с контекстом)

| Экшен | Описание | Приоритет |
|-------|----------|-----------|
| `context-scan` | Сканирование контекста | Средний |
| `context-query` | Запрос контекста | Средний |
| `context-rank` | Ранжирование контекста | Низкий |
| `context-format` | Форматирование контекста | Низкий |

### Структура симуляции для реального экшена

Каждая симуляция должна включать:

```
a2a-server/simulations/<category>/<action-name>/
├── request.json      # Запрос клиента
├── response.json     # Ожидаемый ответ клиента (gold standard)
├── server-response.json  # Реальный ответ сервера (генерируется при запуске)
├── description.md    # Описание что тестируется
└── NOTES.md         # Заметки по результатам
```

#### Описание файлов симуляции

| Файл | Описание | Обязательный |
|------|----------|--------------|
| `request.json` | Входные данные для запроса к серверу | ✅ Да |
| `response.json` | Ожидаемый ответ (gold standard) для сравнения | ✅ Да |
| `server-response.json` | Реальный ответ сервера, сгенерированный при запуске | ✅ Да (создаётся) |
| `description.md` | Описание тестируемого сценария | ✅ Да |
| `NOTES.md` | Заметки по результатам и отклонениях | ⚠️ Рекомендуется |

| `NOTES.md` | Заметки по результатам и отклонениях | ⚠️ Рекомендуется |

---

## Детальная методология создания симуляций

### 1. Процесс создания симуляции для каждого экшена

#### Шаг 1: Подготовка request.json

1. Используйте `simulations/pilot/` как образец
2. Скопируйте структуру request.json
3. Адаптируйте под конкретный экшен:
   - Измените `sessionId`
   - Обновите `context` под тестируемый экшен
   - Настройте параметры в `input`

**Пример request.json:**

```json
{
  "sessionId": "sim-generation-fix-vue-imports-001",
  "message": "Исправь импорты в Vue компонентах",
  "context": {
    "type": "task_request",
    "codebase_summary": "Тестовый проект с Vue компонентами",
    "current_phase": "discovery",
    "workspace": {
      "root": "/test/project",
      "files": ["src/App.vue", "src/components/Header.vue"]
    }
  },
  "requestedAction": "fix-vue-imports"
}
```

#### Шаг 2: Определение expected response (response.json)

1. Проанализируйте определение экшена в `a2a-server/src/actions/definitions/`
2. Определите ожидаемые:
   - `proposedActions` - какие действия предложит сервер
   - `execution` - структура выполнения
   - `subActions` - под-действия

**Пример response.json:**

```json
{
  "sessionId": "sim-generation-fix-vue-imports-001",
  "response": {
    "type": "action_proposal",
    "proposedActions": [
      {
        "id": "fix-vue-imports",
        "name": "Исправить импорты Vue",
        "description": "Анализ и исправление импортов в Vue файлах"
      }
    ],
    "execution": {
      "history": [],
      "executingAction": null,
      "currentStep": 0
    }
  },
  "nextSteps": [
    {
      "type": "approve_action",
      "description": "Выберите действие для выполнения"
    }
  ]
}
```

#### Шаг 3: Запуск симуляции

```bash
cd a2a-server
npm run simulation -- --action fix-vue-imports
# или
npx ts-node scripts/run-simulation.ts fix-vue-imports
```

#### Шаг 4: Сравнение server-response.json с response.json

1. Автоматически генерируется `server-response.json`
2. Сравните с `response.json`:
   - Используйте diff или специализированный скрипт
   - Проверьте структуру ответа
   - Валидируйте по схеме

#### Шаг 5: Документирование различий

Заполните `NOTES.md`:

```markdown
# Заметки по симуляции fix-vue-imports

## Дата: 2026-02-25

### Результат: ✅ Пройдено

### Отклонения от gold standard:
- Время выполнения: 1.2s (ожидалось ~1s)
- Дополнительные метаданные в ответе

### Тестируемые сценарии:
1. Предложение действия fix-vue-imports
2. Выполнение с обнаружением файлов
3. Разрешение проблем с импортами

### Известные проблемы:
- Нет
```

### 2. Приоритеты создания симуляций

#### Фаза 1: Базовые экшены (Высокий приоритет)

| # | Экшен | Категория | Статус |
|---|-------|-----------|--------|
| 1 | `fix-vue-imports` | generation | ✅ Готов (pilot) |
| 2 | `generate-crud` | generation | ⬜ |
| 3 | `hybrid-fix` | hybrid | ⬜ |
| 4 | `analyze-full` | analysis | ⬜ |
| 5 | `generate-controller` | generation | ⬜ |
| 6 | `generate-model` | generation | ⬜ |

#### Фаза 2: Graph экшены (Средний приоритет)

| # | Экшен | Описание |
|---|-------|----------|
| 7 | `graph-build` | Построение графа зависимостей |
| 8 | `graph-impact` | Анализ влияния изменений |
| 9 | `graph-extract-entities` | Извлечение сущностей |
| 10 | `graph-extract-relations` | Извлечение связей |
| 11 | `graph-query` | Запросы к графу |
| 12 | `graph-visualize` | Визуализация графа |

#### Фаза 3: Generation экшены (Средний приоритет)

| # | Экшен | Описание |
|---|-------|----------|
| 13 | `generate-migration` | Генерация миграции |
| 14 | `generate-view` | Генерация представления |
| 15 | `generate-method` | Генерация метода |
| 16 | `generate-test` | Генерация теста |

#### Фаза 4: Analysis экшены (Низкий приоритет)

| # | Экшен | Описание |
|---|-------|----------|
| 17 | `analyze-architecture` | Анализ архитектуры |
| 18 | `analyze-typescript` | Анализ TypeScript |
| 19 | `analyze-vue` | Анализ Vue компонентов |
| 20 | `analyze-laravel` | Анализ Laravel |
| 21 | `analyze-security` | Анализ безопасности |
| 22 | `analyze-performance` | Анализ производительности |
| 23 | `analyze-test` | Анализ покрытия тестами |
| 24 | `phpunit-deprecations` | Поиск deprecated API |

#### Фаза 5: Hybrid и Context экшены (Низкий приоритет)

| # | Экшен | Описание |
|---|-------|----------|
| 25 | `hybrid-refactor` | Рефакторинг кода |
| 26 | `hybrid-improve` | Улучшение кода |
| 27 | `hybrid-explain` | Объяснение кода |
| 28 | `context-scan` | Сканирование контекста |
| 29 | `context-query` | Запрос контекста |
| 30 | `context-rank` | Ранжирование контекста |

### 3. Критерии успеха симуляции

Каждая симуляция считается успешной при выполнении следующих условий:

#### Обязательные критерии

| Критерий | Описание | Метод проверки |
|----------|----------|----------------|
| Корректный response | Сервер возвращает корректный response с правильной структурой | Валидация по схеме |
| Валидный JSON | server-response.json валидна по схеме | JSON Schema валидация |
| Тип ответа | Соответствует ожидаемому типу (action_proposal, action_executing, etc) | Проверка type поля |

#### Дополнительные критерии (желательные)

| Критерий | Описание | Метод проверки |
|----------|----------|----------------|
| Gold standard | Ответ соответствует response.json | Deep comparison |
| Задокументированные отклонения | Все отличия от gold standard задокументированы в NOTES.md | Ручная проверка |
| Выполнение sub-actions | Все sub-actions выполняются корректно | Логирование |

#### Уровни успеха

| Уровень | Статус | Описание |
|---------|--------|----------|
| 🟢 Полный успех | `PASSED` | Все критерии выполнены |
| 🟡 Частичный успех | `PASSED_WITH_NOTES` | Обязательные критерии выполнены, отклонения задокументированы |
| 🔴 Ошибка | `FAILED` | Обязательные критерии не выполнены |

---

## Скрипты автоматизации для работы с симуляциями

В проекте доступны следующие npm-скрипты для автоматизации работы с симуляциями. Все скрипты находятся в директории [`scripts/`](a2a-server/scripts/) и используют TypeScript (tsx).

---

### 1. Создание симуляции

**Скрипт:** `npm run sim:create <action-name>`  
**Файл:** [`scripts/sim-create.ts`](a2a-server/scripts/sim-create.ts)

Создает папку `simulations/<action-name>/` с полным шаблоном симуляции.

#### Генерируемые файлы:

| Файл | Описание |
|------|----------|
| `request.json` | Шаблон запроса с placeholder данными |
| `response.json` | Шаблон ожидаемого ответа (gold standard) |
| `description.md` | Описание тестируемого сценария |
| `NOTES.md` | Шаблон для заметок по результатам |

#### Пример использования:

```bash
# Создание симуляции для экшена fix-vue-imports
npm run sim:create fix-vue-imports

# Создание симуляции для generate-crud
npm run sim:create generate-crud
```

#### Структура созданной директории:

```
simulations/fix-vue-imports/
├── request.json      # Запрос клиента
├── response.json     # Ожидаемый ответ (gold standard)
├── description.md    # Описание сценария
└── NOTES.md         # Заметки по результатам
```

---

### 2. Запуск симуляции

#### Запуск одной симуляции

**Скрипт:** `npm run sim:run <sim-dir>`  
**Файл:** [`scripts/sim-run.ts`](a2a-server/scripts/sim-run.ts)

Запускает симуляцию и генерирует `server-response.json` на основе `request.json`.

#### Пример использования:

```bash
# Запуск симуляции fix-vue-imports
npm run sim:run fix-vue-imports

# Запуск симуляции generate-crud
npm run sim:run generate-crud
```

#### Процесс выполнения:

1. Читает `request.json` из `simulations/<sim-dir>/`
2. Отправляет запрос к серверу
3. Сохраняет ответ в `server-response.json`
4. Выводит результат в консоль

---

#### Запуск всех симуляций

**Скрипт:** `npm run sim:run-all`  
**Файл:** [`scripts/sim-run.ts`](a2a-server/scripts/sim-run.ts)

Последовательно запускает все симуляции в директории `simulations/`.

#### Пример использования:

```bash
# Запуск всех симуляций
npm run sim:run-all
```

#### Результат:

```
Запуск всех симуляций...
✅ fix-vue-imports: Пройдено (1.2s)
✅ generate-crud: Пройдено (0.8s)
✅ hybrid-fix: Пройдено (1.5s)
✅ analyze-full: Пройдено (2.1s)

Итого: 4/4 симуляций пройдено
```

---

### 3. Валидация результатов

#### Валидация по схеме

**Скрипт:** `npm run sim:validate <sim-dir>`  
**Файл:** [`scripts/sim-validate.ts`](a2a-server/scripts/sim-validate.ts)

Проверяет `server-response.json` на соответствие схеме из [`simulations/pilot/schemas.ts`](a2a-server/simulations/pilot/schemas.ts).

#### Пример использования:

```bash
# Валидация симуляции fix-vue-imports
npm run sim:validate fix-vue-imports

# Валидация всех симуляций
for dir in simulations/*/; do
  npm run sim:validate "$(basename "$dir")"
done
```

#### Критерии валидации:

| Критерий | Описание |
|----------|----------|
| Валидный JSON | Файл содержит корректный JSON |
| Соответствие схеме | Поля соответствуют типу ответа |
| Обязательные поля | Все required поля присутствуют |

---

#### Сравнение с gold standard

**Скрипт:** `npm run sim:compare <sim-dir>`  
**Файл:** [`scripts/sim-compare.ts`](a2a-server/scripts/sim-compare.ts)

Сравнивает `server-response.json` с `response.json` (gold standard).

#### Пример использования:

```bash
# Сравнение симуляции fix-vue-imports
npm run sim:compare fix-vue-imports
```

#### Вывод при расхождениях:

```
Сравнение server-response.json с response.json:

🔴 Различия найдены:
  - response.sessionId: "new-session-123" ≠ "expected-session"
  - response.proposedActions[0].name: "Fix Vue Imports" ≠ "Исправить импорты"

✅ Совпадения:
  - response.type: action_proposal
  - execution.history: []
```

---

### 4. Отчетность

#### Генерация отчета

**Скрипт:** `npm run sim:report`  
**Файл:** [`scripts/sim-report.ts`](a2a-server/scripts/sim-report.ts)

Генерирует сводный отчет по всем симуляциям.

#### Пример использования:

```bash
# Генерация отчета
npm run sim:report
```

#### Формат отчета:

```
============================================
ОТЧЕТ ПО СИМУЛЯЦИЯМ
Дата: 2026-02-25
============================================

Симуляция: fix-vue-imports
  Статус: ✅ ПРОЙДЕНО
  Время: 1.2s
  Валидация: ✅
  Gold Standard: ✅

Симуляция: generate-crud
  Статус: ✅ ПРОЙДЕНО
  Время: 0.8s
  Валидация: ✅
  Gold Standard: ⚠️ (2 отклонения в NOTES.md)

Симуляция: hybrid-fix
  Статус: 🔴 ПРОВАЛЕНО
  Время: 2.1s
  Валидация: ❌
  Ошибка: Неверный тип ответа

============================================
ИТОГО: 2/3 пройдено (66.7%)
============================================
```

---

### Полный список команд

| Команда | Описание |
|---------|----------|
| `npm run sim:create <action-name>` | Создать новую симуляцию |
| `npm run sim:run <sim-dir>` | Запустить одну симуляцию |
| `npm run sim:run-all` | Запустить все симуляции |
| `npm run sim:validate <sim-dir>` | Валидировать по схеме |
| `npm run sim:compare <sim-dir>` | Сравнить с gold standard |
| `npm run sim:report` | Сгенерировать отчет |

---

### Примеры использования в CI/CD

#### Локальная разработка

```bash
# 1. Создать новую симуляцию
npm run sim:create my-new-action

# 2. Запустить симуляцию
npm run sim:run my-new-action

# 3. Проверить результат
npm run sim:validate my-new-action
npm run sim:compare my-new-action

# 4. Сгенерировать отчет
npm run sim:report
```

#### CI Pipeline

```yaml
# .github/workflows/simulations.yml
name: Simulations

on: [push, pull_request]

jobs:
  simulations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: cd a2a-server && npm run sim:run-all
      - run: cd a2a-server && npm run sim:report
```

---

### Структура скриптов

```
a2a-server/scripts/
├── sim-create.ts      # Создание симуляции
├── sim-run.ts         # Запуск симуляции
├── sim-validate.ts    # Валидация по схеме
├── sim-compare.ts     # Сравнение с gold standard
└── sim-report.ts      # Генерация отчета
```

---

### Пример: Симуляция для `fix-vue-imports`

```
simulations/generation/fix-vue-imports/
├── request.json      # Пользователь хочет исправить импорты
├── response.json     # Выбор действия пользователем
├── server-response.json  # Сервер предлагает действие
└── analysis.md       # Анализ
```

### Приоритеты создания симуляций

1. **Фаза 1 (Высокий приоритет):**
   - `fix-vue-imports` - уже есть в pilot
   - `generate-crud` - наиболее востребованный
   - `hybrid-fix` - популярный сценарий

2. **Фаза 2 (Средний приоритет):**
   - `graph-build` - важно для понимания проекта
   - `analyze-full` - базовый анализ
   - `generate-model` - частая задача

3. **Фаза 3 (Низкий приоритет):**
   - Остальные экшены по мере необходимости

---

## План унифицированного JSON frontend фреймворка

### Цель

Создание единого JSON-ориентированного frontend фреймворка на основе VueFlow для визуализации и управления A2A протоколом.

### Исследование структуры проекта

#### A2A Server (a2a-server/)

```
a2a-server/
├── src/
│   ├── actions/           # Определения экшенов
│   │   ├── definitions/  # MD файлы экшенов
│   │   ├── dsl/          # DSL парсер
│   │   └── action-*.ts   # Сервисы экшенов
│   ├── controllers/       # REST контроллеры
│   ├── services/         # Бизнес-логика
│   ├── protocol/         # Протокол A2A
│   ├── websocket/        # WebSocket коммуникация
│   └── types/            # TypeScript типы
├── prisma/               # База данных
└── docs/                 # Документация
```

#### A2A Client (a2a-client/)

```
a2a-client/
├── web/                  # Frontend приложение
│   ├── index.html        # Главная страница
│   ├── css/style.css    # Стили
│   └── js/              # JavaScript модули
│       ├── sessions.js  # Управление сессиями
│       └── flow/        # VueFlow компоненты
├── packages/            # NPM пакеты
│   ├── agent/           # Агент
│   ├── api-client/      # API клиент
│   ├── fs-utils/        # Файловые утилиты
│   ├── rag/             # RAG поиск
│   └── script-runner/   # Выполнение скриптов
└── e2e/                 # E2E тесты
```

### Текущее состояние

**Уже реализовано:**
- ✅ VueFlow интеграция (базовая)
- ✅ Action Registry
- ✅ Promise System
- ✅ API Client
- ✅ Flow протокол

**Требует доработки:**
- ❌ Кастомные ноды для всех типов экшенов
- ❌ Полная интеграция с VueFlow
- ❌ UI компоненты (search, forms, panels)
- ❌ Валидация через JSON Schema

### Подход к Unified JSON для UI

#### 1. JSON Schema для компонентов

Каждый UI компонент описывается JSON схемой:

```json
{
  "component": "ActionCard",
  "props": {
    "title": "string",
    "description": "string",
    "tags": ["string"],
    "priority": "number"
  },
  "events": {
    "onRun": "action",
    "onSelect": "action"
  },
  "validation": {
    "required": ["title"],
    "types": {
      "priority": "number"
    }
  }
}
```

#### 2. Маппинг протокола на VueFlow

| ContextBlock.outcome | VueFlow Node | Цвет |
|---------------------|--------------|------|
| task_request | InputNode | #22c55e (green) |
| action_proposal | ProposalNode | #eab308 (yellow) |
| action_executing | ExecutingNode | #3b82f6 (blue) |
| step_result | StepNode | #6b7280 (gray) |
| action_complete | OutputNode | #22c55e (green) |

#### 3. Архитектура данных

```
Frontend State (JSON)
├── flow: { nodes: [], edges: [] }
├── actions: Action[]
├── context: ContextBlock[]
└── tickets: Ticket[]
```

### План реализации

#### Этап 1: Исследование и проектирование (1 неделя)

- [ ] Изучить существующий код VueFlow
- [ ] Определить все типы нод
- [ ] Спроектировать JSON Schema для компонентов
- [ ] Создать техническую спецификацию

#### Этап 2: Базовая структура (2 недели)

- [ ] Настроить VueFlow проект
- [ ] Реализовать базовые компоненты
- [ ] Подключить API Client
- [ ] Создать систему типов

#### Этап 3: Кастомные ноды (2 недели)

- [ ] InputNode - ввод задачи
- [ ] ProposalNode - предложения экшенов
- [ ] ExecutingNode - выполнение
- [ ] StepNode - шаги выполнения
- [ ] OutputNode - результаты

#### Этап 4: UI компоненты (1 неделя)

- [ ] Search Bar
- [ ] Action Cards
- [ ] Action Form (модалка)
- [ ] Tickets Panel

#### Этап 5: Интеграция и тестирование (2 недели)

- [ ] Интеграция с симуляциями
- [ ] E2E тесты
- [ ] Документация
- [ ] Релиз

### Технологии

- **Vue 3** - фреймворк
- **VueFlow** - node-based UI
- **TypeScript** - типизация
- **Vite** - сборка
- **Zod** - валидация JSON

### Критерии успеха

1. Все 5 симуляций pilot проходят через UI
2. Новые симуляции легко добавляются
3. JSON Schema валидирует все компоненты
4. UI соответствует протоколу A2A

---

## Связанные документы

- [a2a-client/plans/unified-ui-plan.md](a2a-client/plans/unified-ui-plan.md) - Предыдущий план UI
- [simulations/pilot/schemas.ts](simulations/pilot/schemas.ts) - Схемы симуляций
- [a2a-server/src/actions/definitions/](a2a-server/src/actions/definitions/) - Определения экшенов
- [a2a-client/web/js/flow/](a2a-client/web/js/flow/) - Текущая VueFlow реализация

---

*Документ создан в рамках работы над A2A Script Agent*
