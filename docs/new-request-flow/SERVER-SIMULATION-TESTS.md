# Server Simulation Testing

## Обзор

Документ описывает процесс тестирования **a2a-server** с использованием симуляций напрямую, без Web UI и Client API. Это позволяет проверить корректность поведения сервера на уровне протокола.

> **Важно:** Это тестирование **не зависит** от Web UI (порт 5173) и Client API (порт 3001). Мы тестируем только a2a-server (порт 3000).

## Архитектура тестирования

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        a2a-script-agent Repository                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  simulations/                          a2a-server/scripts/                  │
│  ├── dialog/                           ├── sim-run.ts         (запуск)       │
│  ├── agent-coder/                     ├── sim-validate.ts    (валидация)     │
│  ├── fix-vue-imports/                 └── ...                                 │
│  └── ...                                                                         │
│                                                                              │
│  docs/new-request-flow/                                                         │
│  └── SERVER-SIMULATION-TESTS.md  (этот документ)                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Server Simulation Runner

### Использование скриптов

В проекте есть готовые скрипты для запуска симуляций:

#### 1. Запуск одной симуляции

```bash
cd a2a-server
npm run sim:run <sim-dir>
```

Примеры:
```bash
npm run sim:run dialog
npm run sim:run coder
npm run sim:run fix-vue-imports
npm run sim:run phpunit-deprecations
```

#### 2. Запуск всех симуляций

```bash
npm run sim:run-all
```

#### 3. Валидация результата

```bash
npm run sim:validate <sim-dir>
npm run sim:validate <sim-dir> -- --verbose
npm run sim:validate <sim-dir> -- --json
```

### Что делают скрипты

| Скрипт | Функция | Вход | Выход |
|--------|---------|------|-------|
| [`sim-run.ts`](../../a2a-server/scripts/sim-run.ts) | Запускает симуляцию | `simulations/<name>/request.json` | `simulations/<name>/server-response.json` |
| [`sim-validate.ts`](../../a2a-server/scripts/sim-validate.ts) | Валидирует ответ по схеме | `simulations/<name>/server-response.json` | Результат валидации |

### Процесс тестирования

```
1. sim-run.ts читает request.json
           ↓
2. Вызывает invoke() сервис
           ↓
3. Сервер создает request с promiseId
           ↓
4. Polling ожидает completion (до 30 сек)
           ↓
5. Сохраняет server-response.json
           ↓
6. sim-validate.ts проверяет по Zod-схеме
```

## Классификация симуляций

### Actions (Server-driven)

Actions - это симуляции с **hardcoded steps**, где сервер самостоятельно определяет следующий шаг на основе `result`.

| Симуляция | Описание | Шагов |
|-----------|----------|-------|
| `fix-vue-imports` | Исправление Vue импортов | 5 |
| `fix-vue-imports-batched` | Пакетное исправление Vue импортов | 4+ |
| `phpunit-deprecations` | Обработка PHP deprecations | 5 |
| `task-decomposition` | Декомпозиция задачи | 9 |
| `test-action-flow` | Тестирование flow действий | 1+ |

**Характеристики:**
- ✅ Предсказуемый поток выполнения
- ✅ Сервер контролирует переход между шагами
- ✅ Нет LLM-вызовов или минимальное количество

### AI-Actions (LLM-driven)

AI-Actions - это симуляции где **LLM динамически выбирает следующий шаг**.

| Каталог в `simulations/` | Описание | Особенности |
|-----------|----------|-------------|
| `dialog/` | Диалог с AI-ассистентом | LLM управляет потоком |
| `agent-coder/` | Агент + код (было `coder/`) | RAG + file operations |
| `agent-coder-smart/` | Умный кодер (было `coder-smart/`) | Расширенные возможности |
| `agent-auto-ai/` | Auto-AI loop (было `auto-ai/`, `auto-ai-v2/`) | Полный tool-цикл |
| `orchestrator-dialog/` | Диалог оркестратора | Сложные сценарии |

**Характеристики:**
- ⚠️ Асинхронный поток (promiseId)
- ⚠️ LLM определяет следующее действие
- ⚠️ Требуется больше времени на выполнение

## Async/promiseId Потоки

### Два типа ответов сервера

#### 1. Синхронный ответ (без LLM)

Используется для Actions - сервер сразу возвращает результат:

```json
{
  "context": { ... },
  "execute": { "script": { ... } }
}
```

#### 2. Асинхронный ответ (с LLM)

Используется для AI-Actions - сервер возвращает promiseId:

```json
{
  "promiseId": "req_abc123",
  "status": "pending"
}
```

### Ожидание результата

Скрипт [`sim-run.ts`](../../a2a-server/scripts/sim-run.ts:154-172) реализует polling:

```typescript
// Ждем результат (polling)
let result = null;
const maxAttempts = 60;
const delay = 500;

for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delay));
    result = await requestService.getResult(promiseId);
    
    if (result && result.status === 'completed') {
        break;
    }
}
```

### Схемы async-ответов

| Схема | Описание | Файл |
|-------|----------|------|
| `server-invoke-response-pending.schema.json` | Pending response | [`json-schemas/server-invoke-response-pending.schema.json`](json-schemas/server-invoke-response-pending.schema.json) |
| `server-invoke-response-execute.schema.json` | Execute response | [`json-schemas/server-invoke-response-execute.schema.json`](json-schemas/server-invoke-response-execute.schema.json) |

## Тестовый Runner

### Расположение

Тестовые файлы находятся в:

```
a2a-server/tests/
├── integration/
│   ├── sessions.test.ts      # API тесты
│   ├── action-iteration.test.ts
│   └── helpers.ts
└── e2e/
    └── action-e2e.test.ts    # E2E тесты
```

### Структура тестов

Тесты используют:
- **supertest** - для HTTP запросов к серверу
- **Vitest** - как тестовый раннер

### Пример API теста

```typescript
import request from 'supertest';
import app from '../../src/app.js';

describe('Invoke API', () => {
    describe('POST /api/v1/invoke', () => {
        it('should return promiseId on success', async () => {
            const res = await request(app)
                .post('/api/v1/invoke')
                .send({
                    context: {version: '1.0', session_id: 'sess-123'},
                    message: 'Test message'
                });
            
            expect(res.status).toBe(201);
            expect(res.body.data.promiseId).toBeDefined();
            expect(res.body.data.status).toBe('pending');
        });
    });
});
```

## Покрытие тестов

### По типам симуляций

| Тип | Симуляции | Покрытие |
|-----|-----------|----------|
| **Actions** | fix-vue-imports, phpunit-deprecations, task-decomposition | ✅ Синхронные, hardcoded steps |
| **AI-Actions** | `dialog/`, `agent-coder/`, `agent-coder-smart/`, `agent-auto-ai/`, … | ⚠️ Асинхронные, LLM-driven |

### По протоколу

| Компонент | Покрытие | Файл схемы |
|-----------|----------|-------------|
| invoke request | ✅ | [`server-invoke-request.schema.json`](json-schemas/server-invoke-request.schema.json) |
| invoke response (execute) | ✅ | [`server-invoke-response-execute.schema.json`](json-schemas/server-invoke-response-execute.schema.json) |
| invoke response (pending) | ✅ | [`server-invoke-response-pending.schema.json`](json-schemas/server-invoke-response-pending.schema.json) |
| first response (form) | ✅ | [`server-invoke-response-first-form.schema.json`](json-schemas/server-invoke-response-first-form.schema.json) |

### По execute типам

| Execute тип | Симуляции | Покрытие |
|-------------|-----------|----------|
| `script` | fix-vue-imports | ✅ |
| `form` | dialog, coder | ✅ |
| `rag-search` | coder | ✅ |
| `read-file` | coder | ✅ |
| `write-file` | coder | ✅ |
| `execute-command` | coder | ✅ |

## Запуск тестов

### Требования

1. **Сервер должен быть запущен** (или использовать встроенные методы)
2. **База данных** должна быть доступна
3. **Переменные окружения**:
   - `SKIP_AUTH=1` - для тестов без auth
   - `ENCRYPTION_KEY` - 32 символа (см. [`tests/setup.ts`](../../a2a-server/tests/setup.ts:16))
   - `DATABASE_URL` - строка подключения к БД

### Команды

```bash
cd a2a-server

# Интеграционные тесты
npm run test:integration

# E2E тесты
npm run test:e2e

# Все тесты
npm test

# Запуск конкретного теста
npx vitest run tests/integration/sessions.test.ts
```

## Добавление новых симуляций

### Структура файлов

```
simulations/<new-simulation>/
├── description.md      # Описание симуляции
├── analysis.md         # Анализ
├── 1/
│   ├── request.json    # Первый запрос
│   └── response.json   # Ожидаемый ответ
├── 2/
│   ├── request.json
│   ├── response.json
│   └── ...
└── ...
```

### request.json формат

```json
{
  "task": "описание задачи"
}
```

Или для последующих шагов:

```json
{
  "context": { ... },
  "result": { "choice": "action-id" }
}
```

### response.json формат

```json
{
  "context": { ... },
  "execute": {
    "script": { ... }
  }
}
```

См. [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md) для полной документации.

## Troubleshooting

### Ошибка: "No result after timeout"

**Причина:** Сервер не успел обработать запрос за 30 секунд.

**Решение:**
- Проверьте, что LLM доступен
- Увеличьте `maxAttempts` в [`sim-run.ts`](../../a2a-server/scripts/sim-run.ts:156)

### Ошибка: "validation failed"

**Причина:** Ответ сервера не соответствует схеме.

**Решение:**
- Проверьте формат в [`sim-validate.ts`](../../a2a-server/scripts/sim-validate.ts)
- Используйте `--verbose` для детальной информации

### Ошибка: "Authentication required"

**Причина:** Требуется токен авторизации.

**Решение:**
- Установите `SKIP_AUTH=1` в .env
- Используйте тестовый token из [`helpers.ts`](../../a2a-server/tests/integration/helpers.ts)

## Ссылки

- [Схема симуляций](../../simulations/SCHEMA.md)
- [Протокол взаимодействия](PROTOCOL.md)
- [LLM Proxy Flow](SIMULATION-LLM-PROXY.md)
- [JSON Схемы](json-schemas/)
- [ADR: Simulations as Golden Standard](../../docs/adr/ADR-0001-simulations-as-golden-standard.md)
