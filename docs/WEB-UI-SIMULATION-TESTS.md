# Simulation-Based Testing for Web UI

> **См. также:** [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md), [WEB-UI.md](WEB-UI.md), [PROTOCOL.md](PROTOCOL.md)

## Обзор

Данный документ описывает подход к тестированию Web UI ([`a2a-client/web/`](../../a2a-client/web/)) с использованием симуляций. Web UI тестируется через Playwright с подключением к Client API, который взаимодействует с a2a-server.

## Архитектура тестирования

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Web UI Simulation Testing                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐    ┌───────────┐ │
│  │ Simulation │    │  Playwright │    │   Client API    │    │a2a-server │ │
│  │(request.json)   │    Test Runner│    │ (localhost:3001)│    │(3000)      │ │
│  └─────────────┘    └──────┬──────┘    └────────┬────────┘    └─────┬─────┘ │
│                           │                     │                  │       │
│                           │    ┌────────────────┴────────────────┘       │
│                           │    │                                            │
│                           v    v                                            │
│                    ┌──────────────┐                                        │
│                    │   Web UI     │                                        │
│                    │(localhost:5173)                                       │
│                    └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Типы тестов

### 1. Component Tests (Unit)

Тестирование отдельных компонентов UI без сервера:

```typescript
// a2a-client/tests/unit/ui-components.test.ts
import { test, describe } from 'vitest';

describe('UI Components', () => {
    // Тесты отдельных компонентов
});
```

### 2. Integration Tests

Тестирование интеграции Web UI с Client API:

```typescript
// a2a-client/tests/integration/web-app.test.ts
import { test, expect } from '@playwright/test';

test.describe('Web App Integration', () => {
    test('connects to client API', async ({ page }) => {
        await page.goto('http://localhost:5173');
        // Проверяем подключение к API
    });
});
```

### 3. Simulation-Driven E2E Tests

Основной тип тестов - управление Web UI через симуляции:

```typescript
// a2a-client/tests/e2e/simulation-driven.spec.ts
import { test, expect } from '@playwright/test';
import { SimulationDriver } from './helpers/simulation-driver.js';

test.describe('Simulation-Driven E2E Tests', () => {
    test('fix-vue-imports workflow', async ({ page }) => {
        const driver = new SimulationDriver(page);
        
        // Загружаем симуляцию
        await driver.loadSimulation('fix-vue-imports');
        
        // Выполняем первый шаг
        await driver.executeStep(1);
        
        // Проверяем UI state
        await expect(page.locator('#action-progress')).toBeVisible();
        
        // Выполняем следующие шаги
        await driver.executeStep(2);
        // ...
    });
});
```

## Simulation Driver

```typescript
// a2a-client/tests/e2e/helpers/simulation-driver.ts
import { Page, Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface SimulationStep {
    request: Record<string, unknown>;
    expectedResponse?: Record<string, unknown>;
}

export class SimulationDriver {
    private page: Page;
    private simulationName: string;
    private simulationPath: string;
    private steps: SimulationStep[] = [];

    constructor(page: Page, simulationName: string = 'fix-vue-imports') {
        this.page = page;
        this.simulationName = simulationName;
        this.simulationPath = path.join(process.cwd(), '..', 'simulations', simulationName);
    }

    /**
     * Загружает симуляцию из директории
     */
    async loadSimulation(): Promise<void> {
        const steps = fs.readdirSync(this.simulationPath)
            .filter(f => /^\d+$/.test(f))
            .sort((a, b) => parseInt(a) - parseInt(b));

        this.steps = steps.map(step => {
            const stepPath = path.join(this.simulationPath, step);
            return {
                request: JSON.parse(fs.readFileSync(path.join(stepPath, 'request.json'), 'utf-8')),
                expectedResponse: fs.existsSync(path.join(stepPath, 'response.json'))
                    ? JSON.parse(fs.readFileSync(path.join(stepPath, 'response.json'), 'utf-8'))
                    : undefined
            };
        });
    }

    /**
     * Выполняет шаг симуляции через Web UI
     */
    async executeStep(stepIndex: number): Promise<{
        uiState: Record<string, unknown>;
        serverResponse: Record<string, unknown>;
    }> {
        const step = this.steps[stepIndex - 1];
        if (!step) {
            throw new Error(`Step ${stepIndex} not found`);
        }

        // Отправляем запрос через Web UI
        const response = await this.sendMessageViaUI(step.request);

        // Проверяем UI state
        const uiState = await this.captureUIState();

        return { uiState, serverResponse: response };
    }

    /**
     * Отправляет сообщение через UI
     */
    private async sendMessageViaUI(request: Record<string, unknown>): Promise<Record<string, unknown>> {
        const { action, context } = request as { 
            action?: Record<string, unknown>; 
            context?: Record<string, unknown> 
        };

        // Извлекаем текст из контекста
        const message = this.extractMessage(context);

        // Заполняем форму
        await this.page.fill('#messageInput', message);
        await this.page.click('#sendMessage');

        // Ждём ответа
        await this.page.waitForResponse(response => 
            response.url().includes('/api/') && response.status() === 200
        );

        // Получаем ответ
        const responseBody = await this.page.evaluate(() => {
            // Получаем данные из window или state
            return (window as any).__lastResponse__;
        });

        return responseBody;
    }

    /**
     * Извлекает сообщение из контекста
     */
    private extractMessage(context?: Record<string, unknown>): string {
        if (!context) return '';
        
        if (context.new_task && Array.isArray(context.new_task)) {
            return context.new_task.join('\n');
        }
        
        if (context.message) {
            return context.message as string;
        }

        return '';
    }

    /**
     * Захватывает состояние UI
     */
    private async captureUIState(): Promise<Record<string, unknown>> {
        return await this.page.evaluate(() => {
            const state = {
                // Панель действий
                actionPanelVisible: document.querySelector('#action-progress')?.clientHeight > 0,
                actionTitle: document.querySelector('#action-title')?.textContent,
                progressBar: document.querySelector('#action-progress-bar')?.getAttribute('value'),
                
                // История сообщений
                messages: Array.from(document.querySelectorAll('.message')).map(el => ({
                    type: el.classList.contains('user') ? 'user' : 'assistant',
                    content: el.textContent
                })),
                
                // Форма (если есть)
                formChoices: Array.from(document.querySelectorAll('.form-choice')).map(el => ({
                    id: el.getAttribute('data-choice-id'),
                    label: el.textContent
                })),
                
                // Терминал
                terminalOutput: document.querySelector('#terminal-output')?.textContent,
            };
            
            return state;
        });
    }

    /**
     * Проверяет UI на соответствие ожидаемому состоянию
     */
    async verifyUIState(expected: Record<string, unknown>): Promise<boolean> {
        const actual = await this.captureUIState();
        
        // Глубокое сравнение (упрощённо)
        return JSON.stringify(actual) === JSON.stringify(expected);
    }

    /**
     * Выполняет всю симуляцию
     */
    async runSimulation(): Promise<{
        totalSteps: number;
        passed: boolean;
        stepResults: Array<{
            step: number;
            uiState: Record<string, unknown>;
            passed: boolean;
        }>;
    }> {
        await this.loadSimulation();
        
        const stepResults: Array<{
            step: number;
            uiState: Record<string, unknown>;
            passed: boolean;
        }> = [];

        for (let i = 0; i < this.steps.length; i++) {
            const result = await this.executeStep(i + 1);
            
            // Проверяем, что UI обновился корректно
            const passed = this.validateStepResponse(result.serverResponse);
            
            stepResults.push({
                step: i + 1,
                uiState: result.uiState,
                passed
            });
        }

        return {
            totalSteps: this.steps.length,
            passed: stepResults.every(r => r.passed),
            stepResults
        };
    }

    /**
     * Проверяет корректность ответа сервера
     */
    private validateStepResponse(response: Record<string, unknown>): boolean {
        // Проверяем наличие необходимых полей
        if (!response.context && !response.action && !response.result) {
            return false;
        }
        
        return true;
    }
}
```

## Workflow Tests

### Action Progress Test

```typescript
// a2a-client/tests/e2e/simulation-action-progress.spec.ts
import { test, expect } from '@playwright/test';
import { SimulationDriver } from './helpers/simulation-driver.js';

test.describe('Simulation Action Progress', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:5173');
    });

    test('should display progress during simulation', async ({ page }) => {
        const driver = new SimulationDriver(page, 'fix-vue-imports');
        
        // Запускаем симуляцию
        const result = await driver.runSimulation();
        
        // Проверяем, что progress отображается
        await expect(page.locator('#action-progress')).toBeVisible();
        await expect(page.locator('#action-progress-bar')).toBeVisible();
        
        // Проверяем общее количество шагов
        const progressText = await page.locator('#action-progress-text').textContent();
        expect(progressText).toContain(`${result.totalSteps}`);
    });
});
```

### Form Choices Test

```typescript
// a2a-client/tests/e2e/simulation-form-choices.spec.ts
import { test, expect } from '@playwright/test';
import { SimulationDriver } from './helpers/simulation-driver.js';

test.describe('Simulation Form Choices', () => {
    test('should handle form choices in simulation', async ({ page }) => {
        const driver = new SimulationDriver(page, 'coder');
        
        // Выполняем шаг, который должен вернуть форму
        const result = await driver.executeStep(1);
        
        // Проверяем наличие формы
        const formChoices = await page.locator('.form-choice').count();
        
        if (formChoices > 0) {
            // Выбираем первый вариант
            await page.locator('.form-choice').first().click();
            
            // Проверяем, что выбор обработан
            await expect(page.locator('.form-choice').first()).not.toBeVisible();
        }
    });
});
```

### Terminal Output Test

```typescript
// a2a-client/tests/e2e/simulation-terminal.spec.ts
import { test, expect } from '@playwright/test';
import { SimulationDriver } from './helpers/simulation-driver.js';

test.describe('Simulation Terminal', () => {
    test('should display terminal output during simulation', async ({ page }) => {
        const driver = new SimulationDriver(page, 'fix-vue-imports');
        
        await driver.executeStep(1);
        
        // Проверяем, что терминал отображает вывод
        const terminal = page.locator('#terminal-output');
        await expect(terminal).toBeVisible();
        
        // Проверяем наличие контента
        const content = await terminal.textContent();
        expect(content).toBeTruthy();
    });
});
```

## Mock API для тестов

Для изоляции тестов можно использовать Mock API:

```typescript
// a2a-client/tests/e2e/fixtures/mock-api.ts
import { Page } from '@playwright/test';

export async function setupMockApi(page: Page): Promise<void> {
    // Перехватываем запросы к API
    await page.route('**/api/v1/**', async route => {
        const url = route.request().url();
        
        if (url.includes('/sessions')) {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({ session_id: 'mock-session-id' })
            });
        } else if (url.includes('/invoke')) {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    result: { message: { content: 'Mock response' } }
                })
            });
        } else {
            await route.continue();
        }
    });
}
```

## Конфигурация Playwright

```typescript
// a2a-client/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    
    webServer: [
        {
            command: 'cd ../a2a-server && npm run dev',
            url: 'http://localhost:3000',
            reuseExistingServer: !process.env.CI,
            timeout: 60000,
        },
        {
            command: 'npx serve web -l 5173',
            url: 'http://localhost:5173',
            reuseExistingServer: !process.env.CI,
            timeout: 60000,
        },
    ],
});
```

## CI/CD Интеграция

```yaml
# .github/workflows/web-ui-simulation-tests.yml
name: Web UI Simulation Tests

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
          cd ../a2a-client && npm install
          
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        
      - name: Run simulation E2E tests
        run: npx playwright test tests/e2e/simulation-driven.spec.ts
        
      - name: Upload Playwright traces
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: playwright-report/
```

## Отладка

### Просмотр трассировок

```bash
# После проваленного теста
npx playwright show-trace playwright-report/trace.zip
```

### Скриншоты при ошибках

Скриншоты автоматически сохраняются при ошибках (настроено в `playwright.config.ts`).

## Ссылки

- [SCHEMA.md](../../simulations/SCHEMA.md) - Формат симуляций
- [REFERENCE.md](../../simulations/REFERENCE.md) - Справочник по симуляциям
- [WEB-UI.md](WEB-UI.md) - Документация Web UI
- [PROTOCOL.md](PROTOCOL.md) - Протокол A2A
- [API-CLIENT-SIMULATION-TESTS.md](API-CLIENT-SIMULATION-TESTS.md) - Тестирование API Client
