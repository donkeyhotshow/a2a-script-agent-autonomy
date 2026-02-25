/**
 * Тесты для PortsConfigManager
 * Тестирует функциональность управления конфигурацией портов
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import portsConfigManager, { PortsConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PortsConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        // Сохраняем оригинальный путь к конфигурации
        originalConfigPath = portsConfigManager.configPath;
        
        // Создаем временный файл конфигурации для тестов
        testConfigPath = path.join(__dirname, 'test-ports-config.json');
        
        // Создаем тестовую конфигурацию
        const testConfig = {
            ports: [
                {
                    name: 'test-port',
                    port: 3000,
                    protocol: 'http',
                    description: 'Test port'
                }
            ],
            singlePorts: [],
            ranges: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        // Временно заменяем путь к конфигурации
        portsConfigManager.configPath = testConfigPath;
        portsConfigManager.clearCache();
    });

    afterEach(async () => {
        // Восстанавливаем оригинальный путь
        portsConfigManager.configPath = originalConfigPath;
        portsConfigManager.clearCache();
        
        // Удаляем тестовый файл
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {
            // Игнорируем ошибки удаления
        }
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию из файла', async () => {
            const config = await portsConfigManager.getConfig();
            
            expect(config).toBeDefined();
            expect(config.ports).toBeDefined();
            expect(Array.isArray(config.ports)).toBe(true);
            expect(config.ports.length).toBe(1);
            expect(config.ports[0].name).toBe('test-port');
        });

        it('должен использовать кэш при повторном вызове', async () => {
            const config1 = await portsConfigManager.getConfig();
            const config2 = await portsConfigManager.getConfig();
            
            expect(config1).toBe(config2); // Должен быть тот же объект (кэш)
        });

        it('должен принудительно перезагружать при forceReload=true', async () => {
            const config1 = await portsConfigManager.getConfig();
            const config2 = await portsConfigManager.getConfig(true);
            
            expect(config1).not.toBe(config2); // Разные объекты
            expect(config1.ports[0].name).toBe(config2.ports[0].name); // Но данные одинаковые
        });
    });

    describe('getPort', () => {
        it('должен возвращать порт по имени', async () => {
            const port = await portsConfigManager.getPort('test-port');
            
            expect(port).toBeDefined();
            expect(port.name).toBe('test-port');
            expect(port.port).toBe(3000);
        });

        it('должен возвращать null для несуществующего порта', async () => {
            const port = await portsConfigManager.getPort('non-existent');
            
            expect(port).toBeNull();
        });
    });

    describe('isPortAvailable', () => {
        it('должен возвращать false для используемого порта', async () => {
            const isAvailable = await portsConfigManager.isPortAvailable(3000);
            
            expect(isAvailable).toBe(false);
        });

        it('должен возвращать true для свободного порта', async () => {
            const isAvailable = await portsConfigManager.isPortAvailable(9999);
            
            expect(isAvailable).toBe(true);
        });
    });

    describe('addPort', () => {
        it('должен добавлять новый порт', async () => {
            const newPort = {
                name: 'new-port',
                port: 4000,
                protocol: 'tcp',
                description: 'New test port'
            };
            
            await portsConfigManager.addPort(newPort);
            
            const config = await portsConfigManager.getConfig();
            expect(config.ports.length).toBe(2);
            
            const addedPort = config.ports.find(p => p.name === 'new-port');
            expect(addedPort).toBeDefined();
            expect(addedPort.port).toBe(4000);
        });

        it('должен выбрасывать ошибку при добавлении порта без имени', async () => {
            const invalidPort = {
                port: 4000,
                protocol: 'tcp'
            };
            
            await expect(portsConfigManager.addPort(invalidPort))
                .rejects.toThrow('Порт должен иметь имя и номер');
        });

        it('должен выбрасывать ошибку при добавлении существующего порта', async () => {
            const duplicatePort = {
                name: 'duplicate-port',
                port: 3000, // Уже используется
                protocol: 'tcp'
            };
            
            await expect(portsConfigManager.addPort(duplicatePort))
                .rejects.toThrow('Порт 3000 уже используется');
        });
    });

    describe('removePort', () => {
        it('должен удалять порт по имени', async () => {
            await portsConfigManager.removePort('test-port');
            
            const config = await portsConfigManager.getConfig();
            expect(config.ports.length).toBe(0);
        });

        it('должен корректно работать с несуществующим портом', async () => {
            const configBefore = await portsConfigManager.getConfig();
            
            await portsConfigManager.removePort('non-existent');
            
            const configAfter = await portsConfigManager.getConfig();
            expect(configAfter.ports.length).toBe(configBefore.ports.length);
        });
    });

    describe('addWatcher', () => {
        it('должен добавлять наблюдателя и вызывать его при изменениях', async () => {
            let watcherCalled = false;
            let receivedConfig = null;
            
            const unwatch = portsConfigManager.addWatcher((config) => {
                watcherCalled = true;
                receivedConfig = config;
            });
            
            // Добавляем порт, чтобы вызвать изменение
            await portsConfigManager.addPort({
                name: 'watcher-test',
                port: 5000,
                protocol: 'tcp'
            });
            
            expect(watcherCalled).toBe(true);
            expect(receivedConfig).toBeDefined();
            expect(receivedConfig.ports.length).toBe(2);
            
            // Удаляем наблюдателя
            unwatch();
        });

        it('должен удалять наблюдателя через unwatch', async () => {
            let watcherCalled = false;
            
            const unwatch = portsConfigManager.addWatcher(() => {
                watcherCalled = true;
            });
            
            // Удаляем наблюдателя
            unwatch();
            
            // Добавляем порт
            await portsConfigManager.addPort({
                name: 'unwatch-test',
                port: 6000,
                protocol: 'tcp'
            });
            
            expect(watcherCalled).toBe(false);
        });
    });

    describe('validateConfig', () => {
        it('должен валидировать корректную конфигурацию', () => {
            const validConfig = {
                ports: [
                    { name: 'port1', port: 3000 },
                    { name: 'port2', port: 3001 }
                ]
            };
            
            const isValid = portsConfigManager.validateConfig(validConfig);
            expect(isValid).toBe(true);
        });

        it('должен отклонять конфигурацию без портов', () => {
            const invalidConfig = {
                metadata: {}
            };
            
            const isValid = portsConfigManager.validateConfig(invalidConfig);
            expect(isValid).toBe(false);
        });

        it('должен отклонять конфигурацию с дублированными портами', () => {
            const invalidConfig = {
                ports: [
                    { name: 'port1', port: 3000 },
                    { name: 'port2', port: 3000 } // Дублированный порт
                ]
            };
            
            const isValid = portsConfigManager.validateConfig(invalidConfig);
            expect(isValid).toBe(false);
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = portsConfigManager.getInfo();
            
            expect(info).toBeDefined();
            expect(info.name).toBe('ports');
            expect(info.path).toBeDefined();
            expect(typeof info.hasCache).toBe('boolean');
            expect(typeof info.watchersCount).toBe('number');
        });
    });

    describe('clearCache', () => {
        it('должен очищать кэш', async () => {
            // Загружаем конфигурацию
            await portsConfigManager.getConfig();
            expect(portsConfigManager.cache).toBeDefined();
            
            // Очищаем кэш
            portsConfigManager.clearCache();
            expect(portsConfigManager.cache).toBeNull();
            expect(portsConfigManager.lastModified).toBeNull();
        });
    });

    describe('singlePorts operations', () => {
        it('должен добавлять новый одиночный порт', async () => {
            const newSinglePort = {
                port: 8080,
                name: 'new-single-port',
                protocol: 'http',
                description: 'New single test port'
            };
            await portsConfigManager.addSinglePort(newSinglePort);

            const config = await portsConfigManager.getConfig(true);
            expect(config.singlePorts.length).toBe(1);
            expect(config.singlePorts[0].name).toBe('new-single-port');
        });

        it('должен обновлять существующий одиночный порт', async () => {
            const existingSinglePort = {
                port: 8081,
                name: 'existing-single-port',
                protocol: 'https',
                description: 'Existing single port'
            };
            await portsConfigManager.addSinglePort(existingSinglePort);

            const updatedSinglePortData = {
                port: 8081,
                name: 'updated-single-port-name',
                description: 'Updated description'
            };
            await portsConfigManager.updateSinglePort(8081, updatedSinglePortData);

            const config = await portsConfigManager.getConfig(true);
            const updatedPort = config.singlePorts.find(p => p.port === 8081);
            expect(updatedPort.name).toBe('updated-single-port-name');
            expect(updatedPort.description).toBe('Updated description');
        });

        it('должен удалять одиночный порт', async () => {
            const singlePortToDelete = {
                port: 8082,
                name: 'to-delete-port',
                protocol: 'tcp'
            };
            await portsConfigManager.addSinglePort(singlePortToDelete);

            await portsConfigManager.removeSinglePort(8082);

            const config = await portsConfigManager.getConfig(true);
            expect(config.singlePorts.length).toBe(0);
        });
    });

    describe('portRanges operations', () => {
        it('должен добавлять новый диапазон портов', async () => {
            const newPortRange = {
                from: 10000,
                to: 10010,
                type: 'allowed',
                description: 'New test range'
            };
            await portsConfigManager.addPortRange(newPortRange);

            const config = await portsConfigManager.getConfig(true);
            expect(config.ranges.length).toBe(1);
            expect(config.ranges[0].from).toBe(10000);
        });

        it('должен обновлять существующий диапазон портов', async () => {
            const existingPortRange = {
                from: 10011,
                to: 10020,
                type: 'blocked',
                description: 'Existing test range'
            };
            await portsConfigManager.addPortRange(existingPortRange);

            const updatedPortRangeData = {
                from: 10011,
                to: 10020,
                type: 'restricted',
                description: 'Updated range description'
            };
            await portsConfigManager.updatePortRange(10011, 10020, updatedPortRangeData);

            const config = await portsConfigManager.getConfig(true);
            const updatedRange = config.ranges.find(r => r.from === 10011 && r.to === 10020);
            expect(updatedRange.type).toBe('restricted');
            expect(updatedRange.description).toBe('Updated range description');
        });

        it('должен удалять диапазон портов', async () => {
            const portRangeToDelete = {
                from: 10021,
                to: 10030,
                type: 'allowed'
            };
            await portsConfigManager.addPortRange(portRangeToDelete);

            await portsConfigManager.removePortRange(10021, 10030);

            const config = await portsConfigManager.getConfig(true);
            expect(config.ranges.length).toBe(0);
        });
    });
});
