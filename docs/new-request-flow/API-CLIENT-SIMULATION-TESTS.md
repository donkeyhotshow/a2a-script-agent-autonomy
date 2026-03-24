# Simulation-Based Testing for API Client

> **См. также:** [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md), [API-CLIENT.md](API-CLIENT.md), [PROTOCOL.md](PROTOCOL.md)

## Обзор

Данный документ описывает подход к тестированию [`sdk`](../../a2a-client/packages/sdk/src/index.ts) с использованием симуляций из директории [`simulations/`](../../simulations/).

## Архитектура тестирования

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Simulation Test Harness                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐ │
│  │ Simulation  │────>│  Test Runner    │────>│   a2a-server      │ │
│  │ (request.json)    │ (sim-run.ts)    │     │   (localhost:3000)│ │
│  └─────────────┘     └─────────────────┘     └──────────────────┘ │
│                              │                                        │
│                              v                                        │
│                     ┌─────────────────┐                              │
│                     │  Verification   │                              │
│                     │ (response.json)  │                              │
│                     └─────────────────┘                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Test Harness

### Основные компоненты

| Компонент | Назначение | Расположение |
|-----------|------------|--------------|
| [`sim-run.ts`](../../a2a-server/scripts/sim-run.ts) | Запуск симуляций против сервера | `a2a-server/scripts/` |
| [`sim-compare.ts`](../../a2a-server/scripts/sim-compare.ts) | Сравнение ответа с ожидаемым | `a2a-server/scripts/` |
| [`run-simulation.js`](../../simulations/run-simulation.js) | Проигрывание шагов симуляции | `simulations/` |

### Test Runner для API Client

Создайте тестовый раннер, который проигрывает каждый шаг симуляции:

```typescript
// a2a-client/packages/sdk/tests/simulation-runner.ts
import {ApiClient} from '../src/index.js';
import * as fs from 'fs';
import * as path from 'path';

export interface SimulationStep {
    request: Record<string, unknown>;
    response?: Record<string, unknown>;
    serverTransformsRequest?: Record<string, unknown>;
    serverTransformsResponse?: Record<string, unknown>;
}

export class SimulationTestRunner {
    private client: ApiClient;
    private simulationPath: string;

    constructor(simulationName: string, serverUrl?: string) {
        this.client = new ApiClient({
            serverUrl: serverUrl || 'http://localhost:3000/api/v1'
        });
        this.simulationPath = path.join(process.cwd(), '..', 'simulations', simulationName);
    }

    /**
     * Проигрывает один шаг симуляции
     */
    async playStep(stepDir: string): Promise<{
        request: Record<string, unknown>;
        response: Record<string, unknown>;
        passed: boolean;
    }> {
        const requestPath = path.join(this.simulationPath, stepDir, 'request.json');
        const expectedResponsePath = path.join(this.simulationPath, stepDir, 'response.json');
        
        const request = JSON.parse(fs.readFileSync(requestPath, 'utf-8'));
        const expectedResponse = expectedResponsePath 
            ? JSON.parse(fs.readFileSync(expectedResponsePath, 'utf-8'))
            : null;

        // Выполняем запрос через api-client
        const response = await this.executeRequest(request);

        // Проверяем соответствие протоколу
        const protocolValid = this.validateProtocol(response);

        // Если есть ожидаемый ответ - сравниваем
        let passed = protocolValid;
        if (expectedResponse) {
            passed = this.compareResponses(response, expectedResponse) && protocolValid;
        }

        return { request, response, passed };
    }

    /**
     * Выполняет запрос через api-client
     */
    private async executeRequest(request: Record<string, unknown>): Promise<Record<string, unknown>> {
        const { action, context } = request as { action?: Record<string, unknown>; context?: Record<string, unknown> };
        
        if (action?.invoke) {
            return await this.client.invoke(action.invoke as string, context || {});
        }
        
        if (context?.session_id) {
            return await this.client.continueSession(context.session_id as string, context);
        }

        throw new Error('Unknown request type');
    }

    /**
     * Проверяет соответствие протоколу
     */
    private validateProtocol(response: Record<string, unknown>): boolean {
        // Проверяем action-key shape
        if (response.result && typeof response.result === 'object') {
            const keys = Object.keys(response.result);
            const validActionTypes = ['read-file', 'write-file', 'script', 'rag-search', 'execute-command', 'form', 'message'];
            
            // Если есть ключ result, это должен быть action-key shape
            if (keys.length > 0 && !validActionTypes.includes(keys[0])) {
                console.warn('Invalid action key:', keys[0]);
                return false;
            }
        }
        return true;
    }

    /**
     * Сравнивает ответы
     */
    private compareResponses(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
        // Упрощённое сравнение - в реальном тесте нужно глубокое сравнение
        return JSON.stringify(actual) === JSON.stringify(expected);
    }

    /**
     * Проигрывает всю симуляцию
     */
    async runSimulation(): Promise<{
        totalSteps: number;
        passedSteps: number;
        results: Array<{step: string; passed: boolean; error?: string}>;
    }> {
        const steps = this.getSteps();
        const results: Array<{step: string; passed: boolean; error?: string}> = [];
        
        for (const step of steps) {
            try {
                const result = await this.playStep(step);
                results.push({ step, passed: result.passed });
            } catch (error) {
                results.push({ 
                    step, 
                    passed: false, 
                    error: error instanceof Error ? error.message : String(error) 
                });
            }
        }

        const passedSteps = results.filter(r => r.passed).length;
        
        return {
            totalSteps: steps.length,
            passedSteps,
            results
        };
    }

    private getSteps(): string[] {
        const stepsPath = path.join(this.simulationPath);
        if (!fs.existsSync(stepsPath)) {
            return [];
        }
        
        return fs.readdirSync(stepsPath)
            .filter(f => /^\d+$/.test(f))
            .sort((a, b) => parseInt(a) - parseInt(b));
    }
}
```

## Использование

### Запуск одной симуляции

```typescript
// a2a-client/packages/sdk/tests/simulation.test.ts
import { SimulationTestRunner } from './simulation-runner.js';

describe('API Client Simulation Tests', () => {
    const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000/api/v1';

    test.each([
        'fix-vue-imports',
        'coder',
        'coder-smart',
        'auto-ai',
        'task-decomposition',
    ])('should play simulation: %s', async (simulationName) => {
        const runner = new SimulationTestRunner(simulationName, serverUrl);
        const result = await runner.runSimulation();

        console.log(`Simulation: ${simulationName}`);
        console.log(`Passed: ${result.passedSteps}/${result.totalSteps}`);
        
        result.results.forEach(r => {
            console.log(`  Step ${r.step}: ${r.passed ? '✓' : '✗'} ${r.error || ''}`);
        });

        expect(result.passedSteps).toBe(result.totalSteps);
    });
});
```

### Сравнение с ожидаемыми ответами

```bash
# Запуск симуляции и сравнение
npm run sim:run fix-vue-imports
npm run sim:compare fix-vue-imports
```

## Переменные окружения

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `TEST_SERVER_URL` | URL a2a-server | `http://localhost:3000/api/v1` |
| `LLM_REPLY_DIR` | Директория с зафиксированными LLM ответами | - |
| `SKIP_AUTH` | Пропустить аутентификацию | `1` |

## Тестируемые протокольные аспекты

### 1. Action-Key Shape

Симуляции проверяют правильность формата:

```typescript
// Правильно ✓
{ result: { "read-file": { path: "...", content: "..." } } }

// Неправильно ✗
{ result: { content: "..." } }
```

#### Пример: Результат (action-key shape)

Результат выполнения скрипта:

```json
{
  "context": { "execution": { "action": "fix-vue-imports", "step": "vue-import-detect" } },
  "result": {
    "script": { "output": { "broken_imports": [...] } }
  }
}
```

#### Пример: Результат с ошибкой

```json
{
  "context": { "execution": { "action": "read-file", "step": "file-read" } },
  "result": {
    "error": {
      "code": "FILE_NOT_FOUND",
      "message": "Файл не найден: /path/to/file.vue"
    }
  }
}
```

### 2. Типы Execute

| Тип | Описание | Проверяется |
|-----|----------|-------------|
| `form` | Интерактивные формы | ✓ |
| `message` | Отображаемые сообщения | ✓ |
| `script` | Выполнение JavaScript | ✓ |
| `rag-search` | RAG поиск | ✓ |
| `read-file` | Чтение файлов | ✓ |
| `write-file` | Запись файлов | ✓ |
| `execute-command` | Выполнение команд | ✓ |

#### Пример: Первый ответ - форма выбора

Когда сервер предлагает выбрать действие:

```json
{
  "context": {
    "task": "виправити імпорти у vue компонентах"
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        { "id": "fix-vue-imports", "label": "Виправити зламані імпорти у Vue файлах" },
        { "id": "auto-ai", "label": "AI Action Generator" }
      ]
    }
  }
}
```

#### Пример: Сообщение пользователю

```json
{
  "context": { "execution": { "step": "analysis" } },
  "execute": {
    "message": {
      "type": "info",
      "content": "Проанализировано 15 файлов. Найдено 3 проблемных импорта."
    }
  }
}
```

### 3. Контекстные поля

Проверяется правильность полей контекста:

- `context.history` - массив выполненных шагов
- `context.execution` - текущее состояние выполнения
- `context.workbench` - структурированное рабочее состояние (`sections`, опционально `batch`, `slots`)

## CI/CD Интеграция

```yaml
# .github/workflows/api-client-tests.yml
name: API Client Simulation Tests

on: [push, pull_request]

jobs:
  simulation-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: |
          cd a2a-server && npm install
          cd ../a2a-client/packages/sdk && npm install
          
      - name: Start a2a-server
        run: |
          cd a2a-server
          npm run db:migrate
          npm run dev &
          sleep 10
          
      - name: Run simulation tests
        run: |
          cd a2a-client/packages/sdk
          npm run test:simulation
          
      - name: Stop server
        if: always()
        run: pkill -f "npm run dev"
```

## Ссылки

- [SCHEMA.md](../../simulations/SCHEMA.md) - Формат симуляций
- [REFERENCE.md](../../simulations/REFERENCE.md) - Справочник по симуляциям
- [API-CLIENT.md](API-CLIENT.md) - Документация api-client
- [PROTOCOL.md](PROTOCOL.md) - Протокол A2A
