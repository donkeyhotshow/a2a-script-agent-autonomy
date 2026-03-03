/**
 * Simulation-Driven E2E Tests for Web UI
 * 
 * End-to-end тесты Web UI с использованием симуляций.
 * 
 * @see docs/new-request-flow/WEB-UI-SIMULATION-TESTS.md
 */

import { test, expect, describe } from '@playwright/test';
import { SimulationDriver } from './helpers/simulation-driver.js';

/**
 * Список симуляций для тестирования
 */
const SIMULATIONS = [
    'fix-vue-imports',
    'coder',
    'coder-smart',
    'auto-ai',
    'task-decomposition',
];

describe('Simulation-Driven E2E Tests', () => {
    // Настройка перед каждым тестом
    test.beforeEach(async ({ page }) => {
        // Переходим на главную страницу
        await page.goto('/');
        
        // Ждём загрузки страницы
        await page.waitForLoadState('networkidle');
    });

    describe('fix-vue-imports Simulation', () => {
        test('должен выполнить полный workflow fix-vue-imports', async ({ page }) => {
            const driver = new SimulationDriver(page, 'fix-vue-imports');
            
            // Загружаем симуляцию
            await driver.loadSimulation();
            
            console.log(`Loaded simulation with ${driver.getStepCount()} steps`);
            
            // Выполняем первый шаг
            const result1 = await driver.executeStep(1);
            
            // Проверяем, что UI обновился
            await expect(page.locator('#messageInput, input[name="message"]')).toBeVisible();
            
            console.log('Step 1 UI state:', result1.uiState);
            
            // Если есть форма - обрабатываем
            if (result1.uiState.formChoices.length > 0) {
                await driver.waitForForm();
                
                // Выбираем первый вариант
                await driver.selectFormChoice(result1.uiState.formChoices[0].id || 'confirm');
                
                // Ждём завершения
                await driver.waitForActionComplete();
            }
            
            // Выполняем следующие шаги
            for (let i = 2; i <= driver.getStepCount(); i++) {
                const result = await driver.executeStep(i);
                console.log(`Step ${i} UI state:`, result.uiState);
                
                // Проверяем что progress обновляется
                if (i < driver.getStepCount()) {
                    await expect(page.locator('#action-progress')).toBeVisible();
                }
            }
        });

        test('должен отображать progress bar во время выполнения', async ({ page }) => {
            const driver = new SimulationDriver(page, 'fix-vue-imports');
            
            // Выполняем первый шаг
            await driver.executeStep(1);
            
            // Проверяем отображение progress
            const progress = page.locator('#action-progress');
            await expect(progress).toBeVisible();
            
            // Проверяем наличие progress bar
            const progressBar = page.locator('#action-progress-bar, .progress-bar');
            await expect(progressBar).toBeVisible();
        });

        test('должен отображать terminal output', async ({ page }) => {
            const driver = new SimulationDriver(page, 'fix-vue-imports');
            
            await driver.executeStep(1);
            
            // Проверяем наличие terminal
            const terminal = page.locator('#terminal-output, .terminal-output, .terminal');
            await expect(terminal).toBeVisible();
            
            // Проверяем что terminal не пустой
            const content = await terminal.textContent();
            expect(content).toBeTruthy();
        });
    });

    describe('coder Simulation', () => {
        test('должен обрабатывать form choices в coder симуляции', async ({ page }) => {
            const driver = new SimulationDriver(page, 'coder');
            
            // Выполняем шаг который может вернуть форму
            await driver.executeStep(1);
            
            // Проверяем наличие элементов интерфейса
            await expect(page.locator('#messageInput')).toBeVisible();
            
            // Если есть форма - проверяем
            const formChoices = page.locator('.form-choice, [data-choice-id]');
            const count = await formChoices.count();
            
            if (count > 0) {
                // Выбираем первый вариант
                await formChoices.first().click();
                
                // Проверяем, что форма исчезла
                await expect(formChoices.first()).not.toBeVisible({ timeout: 5000 });
            }
        });
    });

    describe('Auto AI Simulation', () => {
        test('должен выполнять auto-ai симуляцию', async ({ page }) => {
            const driver = new SimulationDriver(page, 'auto-ai');
            
            // Выполняем симуляцию
            const result = await driver.runSimulation();
            
            console.log('Auto AI simulation result:', result);
            
            // Проверяем что все шаги пройдены
            expect(result.passed).toBe(true);
        });
    });

    describe('UI State Validation', () => {
        test('должен сохранять историю сообщений', async ({ page }) => {
            const driver = new SimulationDriver(page, 'fix-vue-imports');
            
            // Выполняем несколько шагов
            await driver.executeStep(1);
            await driver.executeStep(2);
            
            // Проверяем что сообщения отображаются
            const messages = page.locator('.message, .chat-message, [class*="message"]');
            const count = await messages.count();
            
            expect(count).toBeGreaterThan(0);
        });

        test('должен корректно отображать результаты действий', async ({ page }) => {
            const driver = new SimulationDriver(page, 'fix-vue-imports');
            
            const result = await driver.executeStep(1);
            
            // Проверяем структуру UI state
            expect(result.uiState).toHaveProperty('actionPanelVisible');
            expect(result.uiState).toHaveProperty('messages');
            expect(result.uiState).toHaveProperty('formChoices');
        });
    });
});

/**
 * Параметризованные тесты для всех симуляций
 */
SIMULATIONS.forEach(simulationName => {
    describe(`Parameterized: ${simulationName}`, () => {
        test(`должен загрузить симуляцию ${simulationName}`, async ({ page }) => {
            const driver = new SimulationDriver(page, simulationName);
            
            // Это должно не упасть если симуляция существует
            await expect(driver.loadSimulation()).resolves.not.toThrow();
            
            // Проверяем что шаги загружены
            expect(driver.getStepCount()).toBeGreaterThan(0);
        });
    });
});

export { SIMULATIONS };
