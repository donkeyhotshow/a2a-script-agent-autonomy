/**
 * NetworkConfigManager - Менеджер конфигурации сети
 * Управляет конфигурацией сетевых настроек
 */

const fs = require('fs').promises;
const path = require('path');





class NetworkConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, 'config.json');
        this.cache = null;
        this.lastModified = null;
        this.watchers = new Set();
    }

    async getConfig(forceReload = false) {
        try {
            if (!forceReload && this.cache) {
                const stats = await fs.stat(this.configPath);
                if (stats.mtime.getTime() === this.lastModified) {
                    return this.cache;
                }
            }

            const config = await this.loadConfig();
            this.cache = config;
            this.lastModified = (await fs.stat(this.configPath)).mtime.getTime();
            
            return config;
        } catch (error) {
            console.error('Ошибка получения конфигурации сети:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию сети, используется по умолчанию');
            return this.getDefaultConfig();
        }
    }

    async saveConfig(config) {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
            this.cache = config;
            this.lastModified = (await fs.stat(this.configPath)).mtime.getTime();
            this.notifyWatchers(config);
        } catch (error) {
            console.error('Ошибка сохранения конфигурации сети:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            nodes: [
                { id: 'node1', ip: '192.168.1.1', role: 'master', status: 'active' },
                { id: 'node2', ip: '192.168.1.2', role: 'worker', status: 'active' },
            ],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация сети'
            }
        };
    }

    /**
     * Получить список узлов сети
     * @returns {Promise<Array>} Список узлов
     */
    async getNodes() {
        const config = await this.getConfig();
        return config.nodes || [];
    }

    /**
     * Получить список соединений сети
     * @returns {Promise<Array>} Список соединений
     */
    async getConnections() {
        const config = await this.getConfig();
        return config.connections || [];
    }

    async addNode(nodeConfig) {
        const config = await this.getConfig();
        if (!config.nodes) {
            config.nodes = [];
        }
        const existingNode = config.nodes.find(node => node.id === nodeConfig.id);
        if (existingNode) {
            throw new Error(`Узел с ID ${nodeConfig.id} уже существует`);
        }
        config.nodes.push(nodeConfig);
        await this.saveConfig(config);
    }

    /**
     * Добавить новое соединение сети
     * @param {Object} connectionConfig - Конфигурация соединения
     * @returns {Promise<void>}
     */
    async addConnection(connectionConfig) {
        const config = await this.getConfig();
        if (!config.connections) {
            config.connections = [];
        }
        if (!connectionConfig.id || !connectionConfig.from || !connectionConfig.to) {
            throw new Error('Соединение должно иметь id, from и to');
        }
        const existingConnection = config.connections.find(conn => conn.id === connectionConfig.id);
        if (existingConnection) {
            throw new Error(`Соединение с ID ${connectionConfig.id} уже существует`);
        }
        config.connections.push(connectionConfig);
        await this.saveConfig(config);
    }

    /**
     * Удалить соединение сети
     * @param {string} connectionId - ID соединения
     * @returns {Promise<void>}
     */
    async removeConnection(connectionId) {
        const config = await this.getConfig();
        if (!config.connections) {
            throw new Error(`Соединение с ID ${connectionId} не найдено`);
        }
        const initialLength = config.connections.length;
        config.connections = config.connections.filter(conn => conn.id !== connectionId);
        if (config.connections.length === initialLength) {
            throw new Error(`Соединение с ID ${connectionId} не найдено`);
        }
        await this.saveConfig(config);
    }

    addWatcher(callback) {
        this.watchers.add(callback);
        return () => this.watchers.delete(callback);
    }

    notifyWatchers(config) {
        this.watchers.forEach(callback => {
            try {
                callback(config);
            } catch (error) {
                console.error('Ошибка в наблюдателе конфигурации сети:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'network',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const networkConfigManager = new NetworkConfigManager();

module.exports = networkConfigManager;
