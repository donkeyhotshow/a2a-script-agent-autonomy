# Testing and Mocking Guide

Руководство по системе тестирования в a2a-server.

## Overview

This guide documents the testing infrastructure in a2a-server, covering:

- Mock-based tests (fast, deterministic)
- Real integration tests (full system validation)
- Simulation-based tests (golden standard testing)
- Testing utilities and helpers

## Типы тестов в проекте

Проект использует многоуровневую систему тестов:

| Тип                  | Расположение                                                               | Описание                                                              | Скорость  |
| -------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------- |
| **Unit**             | [`packages/server/tests/unit/`](packages/server/tests/unit/)               | Тестирование отдельных функций и сервисов                             | ⚡ Fast   |
| **Integration**      | [`packages/server/tests/integration/`](packages/server/tests/integration/) | Тестирование взаимодействия компонентов                               | 🟡 Medium |
| **E2E**              | [`packages/server/tests/e2e/`](packages/server/tests/e2e/)                 | Полные end-to-end сценарии                                            | 🔴 Slow   |
| **Simulation-based** | [`packages/server/tests/simulation/`](packages/server/tests/simulation/)   | Тестирование через симуляции (поддержка legacy и step-based форматов) | ⚡ Fast   |

### Форматы симуляций

Система тестирования поддерживает два формата симуляций:

**Legacy формат:**

```
simulations/
├── simulation-name/
│   ├── request.json
│   └── server-response.json
```

**Step-based формат:**

```
simulations/
├── simulation-name/
│   ├── 1/
│   │   ├── request.json
│   │   └── server-response.json
│   ├── 2/
│   │   ├── request.json
│   │   └── server-response.json
│   └── ...
```

Тесты автоматически определяют и поддерживают оба формата.

## Разница между тестами с моками и без

### Тесты с моками (Mock-based)

**Преимущества:**

- Быстрые и стабильные
- Не зависят от внешних сервисов
- Легко воспроизводят сценарии

**Недостатки:**

- Не проверяют реальное поведение
- Могут пропустить интеграционные проблемы

**Использование:**

```bash
# Запуск тестов с моками
npm run test
```

### Тесты без моков (Real)

**Преимущества:**

- Проверяют реальное поведение системы
- Выявляют интеграционные проблемы

**Недостатки:**

- Медленные
- Зависят от внешних сервисов (БД, Redis, LLM)

**Использование:**

```bash
# Запуск интеграционных тестов
SKIP_AUTH=1 npm run test:integration
```

---

## Тесты с мокированием

### Моки LLM ([`packages/server/tests/mocks/llm/`](packages/server/tests/mocks/llm/))

Моки LLM позволяют тестировать AI-driven сценарии без реальных вызовов к LLM провайдерам.

#### Использование Mock LLM Adapter

```typescript
import {
  setupLLMMock,
  mockLLMResponse,
  mockLLMCanonicalResponse,
  createCanonicalResponse,
} from "../mocks/llm/mock-llm-adapter.js";

describe("AI Service Tests", () => {
  let mockCallLLM: any;

  beforeEach(() => {
    const { mockCallLLM: mock } = setupLLMMock({
      verbose: true,
      defaultResponse: createCanonicalResponse({
        step: "completed",
        message: "Test response",
        execute: { message: { text: "Done" } },
        completed: true,
      }),
    });
    mockCallLLM = mock;
  });

  it("should process LLM response", async () => {
    // Установить специфичный ответ
    mockLLMCanonicalResponse("call_123", {
      step: "execute",
      message: "Creating file",
      execute: { "write-file": { path: "/test.txt", content: "hello" } },
      completed: false,
    });

    const response = await mockCallLLM({ context: {} });
    const parsed = JSON.parse(response);

    expect(parsed.step).toBe("execute");
  });
});
```

#### Replay Mode (чтение из файлов)

```typescript
import { createReplayProvider } from "../mocks/llm/mock-llm-adapter.js";

it("should use replay responses", async () => {
  const replayProvider = await createReplayProvider({
    replayDir: "./packages/server/tests/fixtures/simulations/hello-world",
    fallbackToReal: false,
  });

  const response = await replayProvider({ context: {} });
  // response будет прочитано из response.md файла
});
```

### Моки HTTP ([`packages/server/tests/mocks/http/`](packages/server/tests/mocks/http/))

Моки HTTP позволяют перехватывать fetch запросы.

#### Использование MockFetch

```typescript
import { MockFetch, setupMockFetch } from "../mocks/http/mock-fetch.js";

describe("HTTP Client Tests", () => {
  let mockFetch: MockFetch;

  beforeEach(() => {
    mockFetch = setupMockFetch({ verbose: true });

    // Добавить мок responses
    mockFetch.addMock({
      url: "https://api.example.com/data",
      response: {
        ok: true,
        status: 200,
        json: async () => ({ result: "test data" }),
      },
    });
  });

  it("should return mocked response", async () => {
    const fetchFn = mockFetch.getMock();
    const response = await fetchFn("https://api.example.com/data");
    const data = await response.json();

    expect(data.result).toBe("test data");
    expect(mockFetch.wasRequested("https://api.example.com/data")).toBe(true);
  });

  it("should support wildcard URLs", () => {
    mockFetch.addMock({
      url: "https://api.example.com/*",
      response: {
        ok: true,
        status: 200,
        json: async () => ({ wildcard: true }),
      },
    });
  });
});
```

#### Common Mocks

```typescript
import { commonMocks } from "../mocks/http/mock-fetch.js";

// Использование предустановленных моков
mockFetch.addMock({
  url: "https://api.example.com/item/1",
  response: commonMocks.okJson({ id: 1, name: "Item" }),
});

mockFetch.addMock({
  url: "https://api.example.com/missing",
  response: commonMocks.notFound(),
});

mockFetch.addMock({
  url: "https://api.example.com/error",
  response: commonMocks.error(500, "Server Error"),
});
```

### Моки файловой системы ([`packages/server/tests/mocks/filesystem/`](packages/server/tests/mocks/filesystem/))

Моки FS позволяют тестировать файловые операции без реального диска.

#### Использование MockFS

```typescript
import { MockFS, createMockFs } from "../mocks/filesystem/mock-fs.js";

describe("Filesystem Tests", () => {
  let mockFs: MockFS;

  beforeEach(() => {
    mockFs = new MockFS();

    // Добавить тестовые файлы
    mockFs.addFiles({
      "/project/package.json": {
        content: JSON.stringify({ name: "test", version: "1.0.0" }),
      },
      "/project/src/index.ts": {
        content: 'console.log("hello");',
      },
    });
  });

  it("should read mocked file", () => {
    const content = mockFs.readFileSyncText("/project/package.json");
    const pkg = JSON.parse(content);

    expect(pkg.name).toBe("test");
  });

  it("should track file operations", () => {
    mockFs.readFileSyncText("/project/src/index.ts");

    expect(mockFs.wasCalled("readFileSync")).toBe(true);
    expect(mockFs.getCallCount("readFileSync")).toBe(1);
  });
});
```

### Mock Server ([`packages/server/tests/helpers/mock-server.ts`](packages/server/tests/helpers/mock-server.ts))

Легковесный Express сервер для тестирования HTTP API.

```typescript
import { MockA2AServer, commonMockResponses } from "../helpers/mock-server.js";

describe("API Integration Tests", () => {
  let server: MockA2AServer;

  beforeAll(async () => {
    server = new MockA2AServer({ verbose: true });

    // Настроить мок responses
    server.mockInvokeResponse(commonMockResponses.invokeSuccess("promise-123"));

    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("should respond to invoke request", async () => {
    const response = await server
      .request()
      .post("/api/v1/invoke")
      .send({ context: {}, message: "test" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it("should track requests", () => {
    const requests = server.getRequests();
    expect(requests.length).toBeGreaterThan(0);
  });
});
```

### Mock Client ([`tests/helpers/mock-client.ts`](tests/helpers/mock-client.ts))

Mock клиент для тестирования взаимодействия с A2A сервером.

```typescript
import { MockA2AClient, commonScenarios } from "../helpers/mock-client.js";

describe("Client Tests", () => {
  let client: MockA2AClient;

  beforeEach(() => {
    client = new MockA2AClient({ verbose: true });

    // Добавить сценарии
    client.addScenario(
      commonScenarios.immediateComplete({
        message: { text: "Operation completed" },
      }),
    );
  });

  it("should invoke request", async () => {
    const response = await client.invoke({
      context: { version: "1.0" },
      message: "Create a file",
    });

    expect(response.success).toBe(true);
    expect(response.data.status).toBe("completed");
  });

  it("should support pending then complete scenario", async () => {
    const scenarios = commonScenarios.pendingThenComplete("promise-123", {
      message: { text: "Done" },
    });

    scenarios.forEach((s) => client.addScenario(s));

    // Первый вызов - pending
    const pending = await client.invoke({ context: {}, message: "test" });
    expect(pending.data.status).toBe("pending");

    // Второй вызов - completed
    const complete = await client.getTaskStatus("promise-123");
    expect(complete.status).toBe("completed");
  });
});
```

---

## Тесты без мокирования

### Реальные интеграционные тесты ([`tests/integration/real-integration.test.ts`](tests/integration/real-integration.test.ts))

Тестирование с реальной БД и сервером.

**Требования:**

- PostgreSQL с базой `a2a_test`
- Redis
- `SKIP_AUTH=1` для пропуска аутентификации
- Запущенный сервер

```bash
# Запуск
SKIP_AUTH=1 npm run test:integration
```

### Record/Replay тесты ([`tests/integration/record-replay.test.ts`](tests/integration/record-replay.test.ts))

Запись и воспроизведение HTTP ответов.

```bash
# Режим записи (создание baseline)
RECORD_HTTP=1 npm run test:integration

# Режим воспроизведения (по умолчанию)
npm run test:integration
```

### Snapshot тесты ([`tests/integration/snapshot.test.ts`](tests/integration/snapshot.test.ts))

Валидация схем ответов через snapshots.

```bash
# Обновление snapshots
npm test -- --update
```

### Тесты файловой системы ([`tests/integration/filesystem-real.test.ts`](tests/integration/filesystem-real.test.ts))

Реальные файловые операции с временными директориями.

```typescript
// Автоматическая очистка после тестов
describe("Real Filesystem", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should create file", async () => {
    await fs.writeFile(path.join(tempDir, "test.txt"), "content");
    const exists = await fs
      .access(path.join(tempDir, "test.txt"))
      .then(() => true);
    expect(exists).toBe(true);
  });
});
```

---

## Когда какой тип тестов использовать

| Сценарий                                    | Тип тестов                          |
| ------------------------------------------- | ----------------------------------- |
| Тестирование парсинга симуляций             | **Mocks** - LLM моки                |
| Тестирование transform runtime              | **Mocks** - полностью изолированные |
| Тестирование API контрактов                 | **Snapshot** - валидация схем       |
| Тестирование файловых операций              | **Real FS** - интеграционные        |
| E2E тестирование пользовательских сценариев | **E2E** - реальные вызовы           |
| Тестирование работы с БД                    | **Real integration** - с a2a_test   |

---

## Переменные окружения для тестов

| Переменная               | Описание                     | Пример                                         |
| ------------------------ | ---------------------------- | ---------------------------------------------- |
| `SKIP_AUTH=1`            | Пропуск аутентификации       | `SKIP_AUTH=1 npm test`                         |
| `TEST_LLM_PROVIDER=mock` | Использовать мок LLM         | `TEST_LLM_PROVIDER=mock npm test`              |
| `RECORD_HTTP=1`          | Записывать HTTP ответы       | `RECORD_HTTP=1 npm run test:integration`       |
| `LLM_REPLAY_DIR`         | Директория для replay        | `LLM_REPLAY_DIR=./tests/fixtures/llm npm test` |
| `ENCRYPTION_KEY`         | Ключ шифрования (32 символа) | `test-key-12345678901234567890`                |

> **Примечание:** Сервер stateless - не требует базы данных для тестов.

---

## Запуск тестов

```bash
# Все unit тесты с моками (по умолчанию)
npm run test

# Unit тесты в watch режиме
npm run test:watch

# С покрытием кода
npm run test:coverage

# Интеграционные тесты без моков
SKIP_AUTH=1 npm run test:integration

# Тесты симуляций
npm run test:sim
npm run test:sim:all

# Валидация симуляций
npm run test:sim:validate
npm run test:sim:validate:all

# Обновление snapshots
npm test -- --update

# E2E тесты (требует запущенный сервер)
SKIP_AUTH=1 npm run test:e2e
```

---

## Структура тестов

```
a2a-server/tests/
├── action-processor.test.ts       # Unit тесты
├── simulation-based.test.ts       # Симуляционные тесты
├── transform-runtime.test.ts      # Transform тесты
├── setup.ts                      # Глобальная настройка
│
├── mocks/                        # Все моки
│   ├── llm/
│   │   ├── mock-llm-adapter.ts   # Mock LLM адаптер
│   │   └── mock-llm.test.ts     # Тесты мока
│   ├── http/
│   │   ├── mock-fetch.ts         # Mock fetch
│   │   └── index.ts
│   └── filesystem/
│       ├── mock-fs.ts            # Mock файловая система
│       └── index.ts
│
├── helpers/                      # Тестовые утилиты
│   ├── mock-server.ts            # Mock HTTP сервер
│   ├── mock-client.ts            # Mock A2A клиент
│   └── index.ts
│
├── integration/                  # Интеграционные тесты
│   ├── real-integration.test.ts  # Реальная БД
│   ├── record-replay.test.ts     # Record/Replay
│   ├── snapshot.test.ts          # Snapshots
│   ├── filesystem-real.test.ts   # Реальная FS
│   ├── with-mocks.test.ts        # С моками
│   ├── without-mocks.test.ts     # Без моков
│   └── helpers.ts
│
├── unit/                        # Unit тесты сервисов
│   ├── auth.controller.test.ts
│   ├── auth.middleware.test.ts
│   ├── context-parser.test.ts
│   ├── message.service.test.ts
│   └── ...
│
├── e2e/                         # E2E тесты
│   └── action-e2e.test.ts
│
├── simulation/                  # Симуляционные тесты
│   ├── context-pipeline.test.ts
│   └── parser-new-sections.test.ts
│
├── services/                    # Тесты сервисов
│   ├── document-writer.service.test.ts
│   └── ...
│
├── fixtures/                    # Тестовые данные
│   ├── simulations/
│   │   └── hello-world/
│   │       ├── request.json
│   │       └── response.md
│   └── recordings/             # Записанные HTTP ответы
│
└── snapshots/                  # Snapshot файлы
    └── integration/
        └── snapshot.test.ts.snap
```

---

## Примеры

### Пример: Тестирование симуляции с моками

```typescript
import {
  setupLLMMock,
  mockLLMCanonicalResponse,
} from "../mocks/llm/mock-llm-adapter.js";

describe("Hello World Simulation", () => {
  beforeEach(() => {
    setupLLMMock();

    // Мок для первого вызова LLM
    mockLLMCanonicalResponse("call_1", {
      step: "execute",
      message: "Creating hello world file",
      execute: {
        "write-file": {
          path: "/workspace/hello.js",
          content: 'console.log("Hello!");',
        },
      },
      completed: false,
    });

    // Мок для второго вызова (завершение)
    mockLLMCanonicalResponse("call_2", {
      step: "completed",
      message: "File created successfully",
      execute: { message: { text: "Done!" } },
      completed: true,
    });
  });

  it("should process simulation request", async () => {
    // Тест логики обработки симуляции
    const result = await processSimulation({
      context: { sessionId: "test-123" },
      message: "Create hello world",
    });

    expect(result.status).toBe("completed");
  });
});
```

### Пример: Тестирование с Mock Server

```typescript
import { MockA2AServer } from "../helpers/mock-server.js";

describe("Request Processing", () => {
  let server: MockA2AServer;

  beforeAll(async () => {
    server = new MockA2AServer({ port: 3456 });

    // Мок успешного invoke
    server.mockInvokeResponse({
      status: 201,
      body: {
        success: true,
        data: { id: "req-1", promiseId: "promise-1", status: "pending" },
      },
    });

    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("should track all requests", async () => {
    await server
      .request()
      .post("/api/v1/invoke")
      .send({ context: {}, message: "test" });

    expect(server.wasRequested("POST", "/api/v1/invoke")).toBe(true);

    const lastRequest = server.getLastRequest();
    expect(lastRequest?.body.message).toBe("test");
  });
});
```
