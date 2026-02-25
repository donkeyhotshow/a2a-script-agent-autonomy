/**
 * Тесты для EnvironmentsConfigManager
 * Тестирует функциональность управления конфигурацией окружений
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import environmentsConfigManager, { EnvironmentsConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('EnvironmentsConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        originalConfigPath = environmentsConfigManager.configPath;
        testConfigPath = path.join(__dirname, 'test-environments-config.json');
        
        const testConfig = {
            default: 'development',
            profiles: {
                development: { NODE_ENV: 'development', DEBUG: true, LOG_LEVEL: 'debug' },
                production: { NODE_ENV: 'production', DEBUG: false, LOG_LEVEL: 'info' }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        environmentsConfigManager.configPath = testConfigPath;
        environmentsConfigManager.clearCache();
    });

    afterEach(async () => {
        environmentsConfigManager.configPath = originalConfigPath;
        environmentsConfigManager.clearCache();
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {}
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию окружений', async () => {
            const config = await environmentsConfigManager.getConfig();
            expect(config).toBeDefined();
            expect(config.default).toBe('development');
            expect(config.profiles.development).toBeDefined();
        });
    });

    describe('getEnvironment', () => {
        it('должен возвращать конфигурацию окружения по имени', async () => {
            const devEnv = await environmentsConfigManager.getEnvironment('development');
            expect(devEnv).toBeDefined();
            expect(devEnv.NODE_ENV).toBe('development');
        });

        it('должен возвращать null для несуществующего окружения', async () => {
            const nonExistentEnv = await environmentsConfigManager.getEnvironment('non-existent');
            expect(nonExistentEnv).toBeNull();
        });
    });

    describe('getDefaultEnvironment', () => {
        it('должен возвращать конфигурацию окружения по умолчанию', async () => {
            const defaultEnv = await environmentsConfigManager.getDefaultEnvironment();
            expect(defaultEnv).toBeDefined();
            expect(defaultEnv.NODE_ENV).toBe('development');
        });
    });

    describe('addEnvironment', () => {
        it('должен добавлять новое окружение', async () => {
            const newEnvConfig = { NODE_ENV: 'staging', DEBUG: false, LOG_LEVEL: 'info' };
            await environmentsConfigManager.addEnvironment('staging', newEnvConfig);
            const stagingEnv = await environmentsConfigManager.getEnvironment('staging');
            expect(stagingEnv).toBeDefined();
            expect(stagingEnv.NODE_ENV).toBe('staging');
        });

        it('должен выбрасывать ошибку при добавлении существующего окружения', async () => {
            const duplicateEnvConfig = { NODE_ENV: 'development' };
            await expect(environmentsConfigManager.addEnvironment('development', duplicateEnvConfig))
                .rejects.toThrow('Окружение development уже существует');
        });
    });

    describe('updateEnvironment', () => {
        it('должен обновлять конфигурацию окружения', async () => {
            await environmentsConfigManager.updateEnvironment('development', { LOG_LEVEL: 'warn' });
            const devEnv = await environmentsConfigManager.getEnvironment('development');
            expect(devEnv.LOG_LEVEL).toBe('warn');
        });

        it('должен выбрасывать ошибку при обновлении несуществующего окружения', async () => {
            await expect(environmentsConfigManager.updateEnvironment('non-existent', { LOG_LEVEL: 'info' }))
                .rejects.toThrow('Окружение non-existent не найдено');
        });
    });

    describe('addWatcher', () => {
        it('должен вызывать наблюдателя при изменениях', async () => {
            let watcherCalled = false;
            const unwatch = environmentsConfigManager.addWatcher(() => { watcherCalled = true; });
            await environmentsConfigManager.updateEnvironment('development', { DEBUG: false });
            expect(watcherCalled).toBe(true);
            unwatch();
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = environmentsConfigManager.getInfo();
            expect(info).toBeDefined();
            expect(info.name).toBe('environments');
            expect(typeof info.hasCache).toBe('boolean');
        });
    });
});
