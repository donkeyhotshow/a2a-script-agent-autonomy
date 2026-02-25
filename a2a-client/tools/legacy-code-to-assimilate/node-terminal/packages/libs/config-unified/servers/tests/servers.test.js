/**
 * Тесты для ServersConfigManager
 * Тестирует функциональность управления конфигурацией серверов
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import serversConfigManager, { ServersConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ServersConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        // Сохраняем оригинальный путь к конфигурации
        originalConfigPath = serversConfigManager.configPath;
        
        // Создаем временный файл конфигурации для тестов
        testConfigPath = path.join(__dirname, 'test-servers-config.json');
        
        // Создаем тестовую конфигурацию
        const testConfig = {
            servers: {
                'test-server': {
                    port: 3000,
                    ssl: {
                        enabled: false,
                        cert: './certs/test.crt',
                        key: './certs/test.key'
                    },
                    rateLimit: {
                        enabled: true,
                        windowMs: 900000,
                        max: 100
                    },
                    cors: {
                        origin: ['http://localhost:3000'],
                        methods: ['GET', 'POST'],
                        credentials: true
                    }
                }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        // Временно заменяем путь к конфигурации
        serversConfigManager.configPath = testConfigPath;
        serversConfigManager.clearCache();
    });

    afterEach(async () => {
        // Восстанавливаем оригинальный путь
        serversConfigManager.configPath = originalConfigPath;
        serversConfigManager.clearCache();
        
        // Удаляем тестовый файл
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {
            // Игнорируем ошибки удаления
        }
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию серверов', async () => {
            const config = await serversConfigManager.getConfig();
            
            expect(config).toBeDefined();
            expect(config.servers).toBeDefined();
            expect(typeof config.servers).toBe('object');
            expect(config.servers['test-server']).toBeDefined();
        });

        it('должен использовать кэш при повторном вызове', async () => {
            const config1 = await serversConfigManager.getConfig();
            const config2 = await serversConfigManager.getConfig();
            
            expect(config1).toBe(config2); // Должен быть тот же объект (кэш)
        });
    });

    describe('getServer', () => {
        it('должен возвращать конфигурацию сервера по имени', async () => {
            const server = await serversConfigManager.getServer('test-server');
            
            expect(server).toBeDefined();
            expect(server.port).toBe(3000);
            expect(server.ssl.enabled).toBe(false);
            expect(server.rateLimit.enabled).toBe(true);
        });

        it('должен возвращать null для несуществующего сервера', async () => {
            const server = await serversConfigManager.getServer('non-existent');
            
            expect(server).toBeNull();
        });
    });

    describe('addServer', () => {
        it('должен добавлять новый сервер', async () => {
            const newServer = {
                port: 4000,
                ssl: { enabled: true },
                rateLimit: { enabled: false },
                cors: { origin: ['*'] }
            };
            
            await serversConfigManager.addServer('new-server', newServer);
            
            const config = await serversConfigManager.getConfig();
            expect(config.servers['new-server']).toBeDefined();
            expect(config.servers['new-server'].port).toBe(4000);
        });

        it('должен выбрасывать ошибку при добавлении сервера без имени', async () => {
            const serverConfig = { port: 4000 };
            
            await expect(serversConfigManager.addServer('', serverConfig))
                .rejects.toThrow('Сервер должен иметь имя и конфигурацию');
        });

        it('должен добавлять значения по умолчанию для отсутствующих полей', async () => {
            const minimalServer = { port: 5000 };
            
            await serversConfigManager.addServer('minimal-server', minimalServer);
            
            const server = await serversConfigManager.getServer('minimal-server');
            expect(server.ssl.enabled).toBe(false);
            expect(server.rateLimit.enabled).toBe(false);
            expect(server.cors.origin).toEqual(['*']);
        });
    });

    describe('removeServer', () => {
        it('должен удалять сервер по имени', async () => {
            await serversConfigManager.removeServer('test-server');
            
            const config = await serversConfigManager.getConfig();
            expect(config.servers['test-server']).toBeUndefined();
        });

        it('должен корректно работать с несуществующим сервером', async () => {
            const configBefore = await serversConfigManager.getConfig();
            
            await serversConfigManager.removeServer('non-existent');
            
            const configAfter = await serversConfigManager.getConfig();
            expect(Object.keys(configAfter.servers).length)
                .toBe(Object.keys(configBefore.servers).length);
        });
    });

    describe('updateServer', () => {
        it('должен обновлять конфигурацию существующего сервера', async () => {
            const updates = {
                port: 3500,
                ssl: { enabled: true }
            };
            
            await serversConfigManager.updateServer('test-server', updates);
            
            const server = await serversConfigManager.getServer('test-server');
            expect(server.port).toBe(3500);
            expect(server.ssl.enabled).toBe(true);
            // Другие поля должны остаться неизменными
            expect(server.rateLimit.enabled).toBe(true);
        });

        it('должен выбрасывать ошибку при обновлении несуществующего сервера', async () => {
            const updates = { port: 4000 };
            
            await expect(serversConfigManager.updateServer('non-existent', updates))
                .rejects.toThrow('Сервер non-existent не найден');
        });
    });

    describe('getServersList', () => {
        it('должен возвращать список всех серверов', async () => {
            const serversList = await serversConfigManager.getServersList();
            
            expect(Array.isArray(serversList)).toBe(true);
            expect(serversList).toContain('test-server');
        });

        it('должен возвращать пустой массив для пустой конфигурации', async () => {
            // Удаляем все серверы
            await serversConfigManager.removeServer('test-server');
            
            const serversList = await serversConfigManager.getServersList();
            expect(serversList).toEqual([]);
        });
    });

    describe('addWatcher', () => {
        it('должен вызывать наблюдателя при изменениях', async () => {
            let watcherCalled = false;
            let receivedConfig = null;
            
            const unwatch = serversConfigManager.addWatcher((config) => {
                watcherCalled = true;
                receivedConfig = config;
            });
            
            // Добавляем сервер
            await serversConfigManager.addServer('watcher-test', {
                port: 6000,
                ssl: { enabled: false }
            });
            
            expect(watcherCalled).toBe(true);
            expect(receivedConfig).toBeDefined();
            expect(receivedConfig.servers['watcher-test']).toBeDefined();
            
            unwatch();
        });
    });

    describe('validateConfig', () => {
        it('должен валидировать корректную конфигурацию', () => {
            const validConfig = {
                servers: {
                    'server1': { port: 3000 },
                    'server2': { port: 3001 }
                }
            };
            
            const isValid = serversConfigManager.validateConfig(validConfig);
            expect(isValid).toBe(true);
        });

        it('должен отклонять конфигурацию без серверов', () => {
            const invalidConfig = {
                metadata: {}
            };
            
            const isValid = serversConfigManager.validateConfig(invalidConfig);
            expect(isValid).toBe(false);
        });

        it('должен отклонять конфигурацию с сервером без порта', () => {
            const invalidConfig = {
                servers: {
                    'invalid-server': {
                        ssl: { enabled: false }
                        // Отсутствует port
                    }
                }
            };
            
            const isValid = serversConfigManager.validateConfig(invalidConfig);
            expect(isValid).toBe(false);
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = serversConfigManager.getInfo();
            
            expect(info).toBeDefined();
            expect(info.name).toBe('servers');
            expect(info.path).toBeDefined();
            expect(typeof info.hasCache).toBe('boolean');
            expect(typeof info.watchersCount).toBe('number');
        });
    });
});
