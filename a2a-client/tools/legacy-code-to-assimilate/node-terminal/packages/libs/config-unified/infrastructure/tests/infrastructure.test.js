/**
 * Тесты для InfrastructureConfigManager
 * Тестирует функциональность управления конфигурацией инфраструктуры
 * Версия: 1.0.1
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import infrastructureConfigManager, { InfrastructureConfigManager } from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('InfrastructureConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        originalConfigPath = infrastructureConfigManager.configPath;
        testConfigPath = path.join(__dirname, 'test-infrastructure-config.json');
        
        const testConfig = {
            version: "2.0.0",
            lastUpdated: new Date().toISOString(),
            infrastructure: {
                master: {
                    host: "192.168.1.10",
                    port: 5179,
                    apiKey: "master-api-key-12345",
                    environment: "production",
                    status: "active",
                    lastSeen: "2024-08-18T12:00:00Z",
                    capabilities: ["service_management", "monitoring"],
                    config: { maxSlaves: 10, autoDiscovery: true }
                },
                slaves: [
                    {
                        id: "slave-001",
                        host: "192.168.1.101",
                        port: 3012,
                        environment: "production",
                        status: "active"
                    }
                ]
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        infrastructureConfigManager.configPath = testConfigPath;
        infrastructureConfigManager.clearCache();
    });

    afterEach(async () => {
        infrastructureConfigManager.configPath = originalConfigPath;
        infrastructureConfigManager.clearCache();
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {}
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию инфраструктуры', async () => {
            const config = await infrastructureConfigManager.getConfig();
            expect(config).toBeDefined();
            expect(config.infrastructure.master.host).toBe('192.168.1.10');
            expect(config.infrastructure.slaves.length).toBe(1);
        });
    });

    describe('getMasterConfig', () => {
        it('должен возвращать конфигурацию мастера', async () => {
            const masterConfig = await infrastructureConfigManager.getMasterConfig();
            expect(masterConfig).toBeDefined();
            expect(masterConfig.port).toBe(5179);
        });
    });

    describe('getSlaves', () => {
        it('должен возвращать список слейвов', async () => {
            const slaves = await infrastructureConfigManager.getSlaves();
            expect(slaves).toBeDefined();
            expect(slaves.length).toBe(1);
            expect(slaves[0].id).toBe('slave-001');
        });
    });

    describe('addSlave', () => {
        it('должен добавлять нового слейва', async () => {
            const newSlave = { id: 'slave-002', host: '192.168.1.102', port: 3013, environment: 'staging' };
            await infrastructureConfigManager.addSlave(newSlave);
            const slaves = await infrastructureConfigManager.getSlaves();
            expect(slaves.length).toBe(2);
            expect(slaves.find(s => s.id === 'slave-002')).toBeDefined();
        });

        it('должен выбрасывать ошибку при добавлении существующего слейва', async () => {
            const duplicateSlave = { id: 'slave-001', host: '192.168.1.103', port: 3014 };
            await expect(infrastructureConfigManager.addSlave(duplicateSlave))
                .rejects.toThrow('Слейв с ID slave-001 уже существует');
        });
    });

    describe('removeSlave', () => {
        it('должен удалять слейва по ID', async () => {
            await infrastructureConfigManager.removeSlave('slave-001');
            const slaves = await infrastructureConfigManager.getSlaves();
            expect(slaves.length).toBe(0);
        });

        it('должен корректно работать с несуществующим слейвом', async () => {
            const slavesBefore = await infrastructureConfigManager.getSlaves();
            await infrastructureConfigManager.removeSlave('non-existent-slave');
            const slavesAfter = await infrastructureConfigManager.getSlaves();
            expect(slavesAfter.length).toBe(slavesBefore.length);
        });
    });

    describe('updateSlaveStatus', () => {
        it('должен обновлять статус слейва', async () => {
            await infrastructureConfigManager.updateSlaveStatus('slave-001', 'inactive');
            const slave = await infrastructureConfigManager.getSlave('slave-001');
            expect(slave.status).toBe('inactive');
        });

        it('должен выбрасывать ошибку при обновлении статуса несуществующего слейва', async () => {
            await expect(infrastructureConfigManager.updateSlaveStatus('non-existent', 'active'))
                .rejects.toThrow('Слейв с ID non-existent не найден');
        });
    });

    describe('updateMasterConfig', () => {
        it('должен обновлять конфигурацию мастера', async () => {
            await infrastructureConfigManager.updateMasterConfig({ port: 5200, environment: 'development' });
            const masterConfig = await infrastructureConfigManager.getMasterConfig();
            expect(masterConfig.port).toBe(5200);
            expect(masterConfig.environment).toBe('development');
        });
    });

    describe('addWatcher', () => {
        it('должен вызывать наблюдателя при изменениях', async () => {
            let watcherCalled = false;
            const unwatch = infrastructureConfigManager.addWatcher(() => { watcherCalled = true; });
            await infrastructureConfigManager.addSlave({ id: 'watcher-slave', host: '1.1.1.1', port: 9000 });
            expect(watcherCalled).toBe(true);
            unwatch();
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = infrastructureConfigManager.getInfo();
            expect(info).toBeDefined();
            expect(info.name).toBe('infrastructure');
            expect(typeof info.hasCache).toBe('boolean');
        });
    });
});
