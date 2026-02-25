/**
 * Тесты для AppArchitecturesConfigManager
 * Тестирует функциональность управления конфигурацией архитектур приложений
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import appArchitecturesConfigManager, { AppArchitecturesConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AppArchitecturesConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        originalConfigPath = appArchitecturesConfigManager.configPath;
        testConfigPath = path.join(__dirname, 'test-app-architectures-config.json');
        
        const testConfig = {
            architectures: {
                microservices: {
                    description: "Архитектура, основанная на небольших сервисах.",
                    components: ["API Gateway"]
                }
            },
            templates: {
                nodejs: {
                    description: "Шаблон для Node.js приложения.",
                    techStack: ["Node.js", "Express.js"]
                }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        appArchitecturesConfigManager.configPath = testConfigPath;
        appArchitecturesConfigManager.clearCache();
    });

    afterEach(async () => {
        appArchitecturesConfigManager.configPath = originalConfigPath;
        appArchitecturesConfigManager.clearCache();
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {}
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию архитектур приложений', async () => {
            const config = await appArchitecturesConfigManager.getConfig();
            expect(config).toBeDefined();
            expect(config.architectures.microservices).toBeDefined();
            expect(config.templates.nodejs).toBeDefined();
        });
    });

    describe('getArchitecture', () => {
        it('должен возвращать архитектуру по имени', async () => {
            const microservicesArch = await appArchitecturesConfigManager.getArchitecture('microservices');
            expect(microservicesArch).toBeDefined();
            expect(microservicesArch.components.length).toBe(1);
        });

        it('должен возвращать null для несуществующей архитектуры', async () => {
            const nonExistentArch = await appArchitecturesConfigManager.getArchitecture('non-existent');
            expect(nonExistentArch).toBeNull();
        });
    });

    describe('getTemplate', () => {
        it('должен возвращать шаблон по имени', async () => {
            const nodejsTemplate = await appArchitecturesConfigManager.getTemplate('nodejs');
            expect(nodejsTemplate).toBeDefined();
            expect(nodejsTemplate.techStack.length).toBe(2);
        });

        it('должен возвращать null для несуществующего шаблона', async () => {
            const nonExistentTemplate = await appArchitecturesConfigManager.getTemplate('custom');
            expect(nonExistentTemplate).toBeNull();
        });
    });

    describe('addArchitecture', () => {
        it('должен добавлять новую архитектуру', async () => {
            const newArch = { description: 'Новая архитектура', components: ['Component A'] };
            await appArchitecturesConfigManager.addArchitecture('new-arch', newArch);
            const addedArch = await appArchitecturesConfigManager.getArchitecture('new-arch');
            expect(addedArch).toBeDefined();
            expect(addedArch.components.length).toBe(1);
        });

        it('должен выбрасывать ошибку при добавлении существующей архитектуры', async () => {
            const duplicateArch = { description: 'Дубликат' };
            await expect(appArchitecturesConfigManager.addArchitecture('microservices', duplicateArch))
                .rejects.toThrow('Архитектура microservices уже существует');
        });
    });

    describe('addWatcher', () => {
        it('должен вызывать наблюдателя при изменениях', async () => {
            let watcherCalled = false;
            const unwatch = appArchitecturesConfigManager.addWatcher(() => { watcherCalled = true; });
            await appArchitecturesConfigManager.addArchitecture('watcher-arch', { description: 'Watcher', components: [] });
            expect(watcherCalled).toBe(true);
            unwatch();
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = appArchitecturesConfigManager.getInfo();
            expect(info).toBeDefined();
            expect(info.name).toBe('app-architectures');
            expect(typeof info.hasCache).toBe('boolean');
        });
    });
});
