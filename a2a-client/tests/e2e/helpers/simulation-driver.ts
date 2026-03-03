/**
 * Simulation Driver for Web UI E2E Tests
 * 
 * Управляет Web UI через симуляции для end-to-end тестирования.
 * 
 * @see docs/new-request-flow/WEB-UI-SIMULATION-TESTS.md
 */

import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface SimulationStep {
    request: Record<string, unknown>;
    expectedResponse?: Record<string, unknown>;
}

export interface UIState {
    actionPanelVisible: boolean;
    actionTitle: string | null;
    progressBar: string | null;
    messages: Array<{ type: 'user' | 'assistant'; content: string }>;
    formChoices: Array<{ id: string | null; label: string }>;
    terminalOutput: string | null;
}

export class SimulationDriver {
    private page: Page;
    private simulationName: string;
    private simulationPath: string;
    private steps: SimulationStep[] = [];

    constructor(page: Page, simulationName: string = 'fix-vue-imports', simulationsBasePath?: string) {
        this.page = page;
        this.simulationName = simulationName;
        this.simulationPath = path.join(
            simulationsBasePath || path.join(process.cwd(), '..', 'simulations'),
            simulationName
        );
    }

    /**
     * Загружает симуляцию из директории
     */
    async loadSimulation(): Promise<void> {
        if (!fs.existsSync(this.simulationPath)) {
            throw new Error(`Simulation not found: ${this.simulationPath}`);
        }

        const stepDirs = fs.readdirSync(this.simulationPath)
            .filter(f => /^\d+$/.test(f))
            .sort((a, b) => parseInt(a) - parseInt(b));

        this.steps = stepDirs.map(step => {
            const stepPath = path.join(this.simulationPath, step);
            const requestPath = path.join(stepPath, 'request.json');
            const responsePath = path.join(stepPath, 'response.json');

            return {
                request: JSON.parse(fs.readFileSync(requestPath, 'utf-8')),
                expectedResponse: fs.existsSync(responsePath)
                    ? JSON.parse(fs.readFileSync(responsePath, 'utf-8'))
                    : undefined
            };
        });
    }

    /**
     * Выполняет шаг симуляции через Web UI
     */
    async executeStep(stepIndex: number): Promise<{
        uiState: UIState;
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
        const { context } = request as {
            context?: Record<string, unknown>;
        };

        // Извлекаем текст из контекста
        const message = this.extractMessage(context);

        if (!message) {
            throw new Error('No message found in request');
        }

        // Заполняем форму и отправляем
        const messageInput = this.page.locator('#messageInput, input[name="message"], textarea[name="message"]').first();
        const sendButton = this.page.locator('#sendMessage, button[type="submit"]').first();

        await messageInput.fill(message);
        await sendButton.click();

        // Ждём ответа от сервера
        try {
            await this.page.waitForResponse(
                response => 
                    response.url().includes('/api/') && 
                    (response.status() === 200 || response.status() === 201),
                { timeout: 30000 }
            );
        } catch (error) {
            console.warn('Timeout waiting for API response');
        }

        // Получаем данные из page state
        return await this.page.evaluate(() => {
            // Пробуем получить из window.__APP_STATE__ или window.__A2A_STATE__
            const state = (window as any).__APP_STATE__ || (window as any).__A2A_STATE__;
            
            // Или из последнего ответа
            const lastResponse = (window as any).__lastApiResponse__;
            
            return lastResponse || state || {};
        });
    }

    /**
     * Извлекает сообщение из контекста
     */
    private extractMessage(context?: Record<string, unknown>): string {
        if (!context) return '';

        if (context.new_task && Array.isArray(context.new_task)) {
            return context.new_task.join('\n');
        }

        if (typeof context.new_task === 'string') {
            return context.new_task;
        }

        if (context.message) {
            return context.message as string;
        }

        return '';
    }

    /**
     * Захватывает состояние UI
     */
    async captureUIState(): Promise<UIState> {
        return await this.page.evaluate(() => {
            const getElementText = (selector: string): string | null => {
                const el = document.querySelector(selector);
                return el ? el.textContent?.trim() || null : null;
            };

            const getElementAttribute = (selector: string, attr: string): string | null => {
                const el = document.querySelector(selector);
                return el ? el.getAttribute(attr) : null;
            };

            const state: UIState = {
                // Action panel
                actionPanelVisible: (document.querySelector('#action-progress')?.clientHeight ?? 0) > 0,
                actionTitle: getElementText('#action-title, .action-title'),
                progressBar: getElementText('#action-progress-text, .progress-text'),
                
                // Messages
                messages: Array.from(document.querySelectorAll('.message, .chat-message, [class*="message"]')).map(el => ({
                    type: el.classList.contains('user') || el.classList.contains('user-message') 
                        ? 'user' 
                        : 'assistant',
                    content: el.textContent?.trim() || ''
                })).filter(m => m.content),
                
                // Form choices
                formChoices: Array.from(document.querySelectorAll('.form-choice, .choice, [data-choice-id]')).map(el => ({
                    id: el.getAttribute('data-choice-id') || el.getAttribute('id'),
                    label: el.textContent?.trim() || ''
                })),
                
                // Terminal
                terminalOutput: getElementText('#terminal-output, .terminal-output, .terminal')
            };

            return state;
        });
    }

    /**
     * Выполняет всю симуляцию
     */
    async runSimulation(): Promise<{
        totalSteps: number;
        passed: boolean;
        stepResults: Array<{
            step: number;
            uiState: UIState;
            passed: boolean;
        }>;
    }> {
        await this.loadSimulation();

        const stepResults: Array<{
            step: number;
            uiState: UIState;
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
        if (!response.context && !response.action && !response.result && !response.execute) {
            return false;
        }

        return true;
    }

    /**
     * Ожидает появления элемента формы
     */
    async waitForForm(timeout: number = 10000): Promise<void> {
        await this.page.waitForSelector('.form-choice, [data-choice-id], .choice', { timeout });
    }

    /**
     * Выбирает вариант формы
     */
    async selectFormChoice(choiceId: string): Promise<void> {
        const choice = this.page.locator(`[data-choice-id="${choiceId}"], .form-choice:has-text("${choiceId}")`).first();
        await choice.click();
    }

    /**
     * Ожидает завершения action
     */
    async waitForActionComplete(timeout: number = 30000): Promise<void> {
        // Ждём пока progress bar не исчезнет или появится result
        await this.page.waitForFunction(
            () => {
                const progress = document.querySelector('#action-progress');
                const hasResult = document.querySelector('.result, .message.assistant');
                return !progress || progress.clientHeight === 0 || hasResult;
            },
            { timeout }
        );
    }

    /**
     * Получает имя симуляции
     */
    getSimulationName(): string {
        return this.simulationName;
    }

    /**
     * Получает количество шагов
     */
    getStepCount(): number {
        return this.steps.length;
    }
}

export default SimulationDriver;
