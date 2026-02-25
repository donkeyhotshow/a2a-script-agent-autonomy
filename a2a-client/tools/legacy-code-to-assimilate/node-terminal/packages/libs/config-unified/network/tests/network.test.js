/**
 * Тесты для NetworkConfigManager
 * Тестирует функциональность управления конфигурацией сети
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const fs = require('fs').promises;
const path = require('path');
const networkConfigManager = require('../index.js');

const currentFile = __filename;
const currentDir = __dirname;

describe('NetworkConfigManager', () => {
    let testConfigPath;
    let originalConfigPath;

    beforeEach(async () => {
        originalConfigPath = networkConfigManager.configPath;
        testConfigPath = path.join(currentDir, 'test-network-config.json');
        
        const testConfig = {
            nodes: [
                { id: "router-1", name: "Core Router", type: "router", status: "active", ip: "192.168.1.1", x: 400, y: 100 },
                { id: "switch-1", name: "Switch A", type: "switch", status: "active", ip: "192.168.1.2", x: 250, y: 200 }
            ],
            connections: [
                { id: "conn-r1-s1", from: "router-1", to: "switch-1", bandwidth: "1Gbps", latency: 2, status: "active" }
            ],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Test configuration'
            }
        };
        
        await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        
        networkConfigManager.configPath = testConfigPath;
        networkConfigManager.clearCache();
    });

    afterEach(async () => {
        networkConfigManager.configPath = originalConfigPath;
        networkConfigManager.clearCache();
        try {
            await fs.unlink(testConfigPath);
        } catch (error) {}
    });

    describe('getConfig', () => {
        it('должен загружать конфигурацию сети', async () => {
            const config = await networkConfigManager.getConfig();
            expect(config).toBeDefined();
            expect(config.nodes.length).toBe(2);
            expect(config.connections.length).toBe(1);
        });
    });

    describe('getNodes', () => {
        it('должен возвращать список узлов', async () => {
            const nodes = await networkConfigManager.getNodes();
            expect(nodes).toBeDefined();
            expect(nodes.length).toBe(2);
            expect(nodes[0].id).toBe('router-1');
        });
    });

    describe('getConnections', () => {
        it('должен возвращать список соединений', async () => {
            const connections = await networkConfigManager.getConnections();
            expect(connections).toBeDefined();
            expect(connections.length).toBe(1);
            expect(connections[0].id).toBe('conn-r1-s1');
        });
    });

    describe('addNode', () => {
        it('должен добавлять новый узел', async () => {
            const newNode = { id: 'server-1', name: 'Web Server', type: 'server', status: 'active', ip: '192.168.1.100' };
            await networkConfigManager.addNode(newNode);
            const nodes = await networkConfigManager.getNodes();
            expect(nodes.length).toBe(3);
            expect(nodes.find(n => n.id === 'server-1')).toBeDefined();
        });
    });

    describe('removeNode', () => {
        it('должен удалять узел по ID', async () => {
            await networkConfigManager.removeNode('router-1');
            const nodes = await networkConfigManager.getNodes();
            expect(nodes.length).toBe(1);
            expect(nodes.find(n => n.id === 'router-1')).toBeUndefined();
        });
    });

    describe('addConnection', () => {
        it('должен добавлять новое соединение', async () => {
            const newConnection = { id: 'conn-s1-s2', from: 'switch-1', to: 'switch-2', bandwidth: '100Mbps' };
            await networkConfigManager.addConnection(newConnection);
            const connections = await networkConfigManager.getConnections();
            expect(connections.length).toBe(2);
            expect(connections.find(c => c.id === 'conn-s1-s2')).toBeDefined();
        });
    });

    describe('removeConnection', () => {
        it('должен удалять соединение по ID', async () => {
            await networkConfigManager.removeConnection('conn-r1-s1');
            const connections = await networkConfigManager.getConnections();
            expect(connections.length).toBe(0);
        });
    });

    describe('addWatcher', () => {
        it('должен вызывать наблюдателя при изменениях', async () => {
            let watcherCalled = false;
            const unwatch = networkConfigManager.addWatcher(() => { watcherCalled = true; });
            await networkConfigManager.addNode({ id: 'watcher-node', name: 'Watcher Node', type: 'server', status: 'active', ip: '1.2.3.4' });
            expect(watcherCalled).toBe(true);
            unwatch();
        });
    });

    describe('getInfo', () => {
        it('должен возвращать информацию о менеджере', () => {
            const info = networkConfigManager.getInfo();
            expect(info).toBeDefined();
            expect(info.name).toBe('network');
            expect(typeof info.hasCache).toBe('boolean');
        });
    });
});
