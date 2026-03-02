/**
 * Session Flow Storage - управление состоянием VueFlow узлов сессий в localStorage
 * Запоминает добавленные таблички сессий для восстановления при загрузке
 */

const SessionFlowStorage = {
    STORAGE_KEY: 'a2a-session-flow-nodes',

    /**
     * Сохранить узел сессии
     * @param {Object} node - VueFlow узел
     * @returns {Array} - массив всех сохранённых узлов
     */
    saveNode(node) {
        const nodes = this.getNodes();
        const existing = nodes.findIndex(n => n.id === node.id);
        if (existing >= 0) {
            nodes[existing] = node;
        } else {
            nodes.push(node);
        }
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nodes));
        console.log('Session node saved:', node.id, 'Total:', nodes.length);
        return nodes;
    },

    /**
     * Получить все сохранённые узлы
     * @returns {Array} - массив узлов
     */
    getNodes() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load session nodes from localStorage:', e);
            return [];
        }
    },

    /**
     * Обновить существующий узел
     * @param {string} nodeId - ID узла
     * @param {Object} updates - обновления
     */
    updateNode(nodeId, updates) {
        const nodes = this.getNodes();
        const index = nodes.findIndex(n => n.id === nodeId);
        if (index >= 0) {
            nodes[index] = {...nodes[index], ...updates};
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nodes));
        }
        return nodes;
    },

    /**
     * Удалить узел по ID
     * @param {string} nodeId - ID узла
     * @returns {Array} - массив оставшихся узлов
     */
    removeNode(nodeId) {
        const nodes = this.getNodes().filter(n => n.id !== nodeId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nodes));
        console.log('Session node removed:', nodeId, 'Remaining:', nodes.length);
        return nodes;
    },

    /**
     * Очистить все узлы
     */
    clear() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('All session nodes cleared from localStorage');
    },

    /**
     * Получить узел по ID сессии
     * @param {string} sessionId - ID сессии
     * @returns {Object|null} - найденный узел или null
     */
    getNodeBySessionId(sessionId) {
        return this.getNodes().find(n => n.data?.sessionId === sessionId);
    },

    /**
     * Проверить есть ли узел для сессии
     * @param {string} sessionId - ID сессии
     * @returns {boolean}
     */
    hasSessionNode(sessionId) {
        return this.getNodes().some(n => n.data?.sessionId === sessionId);
    },

    /**
     * Получить следующую позицию для нового узла
     * @returns {Object} - {x, y}
     */
    getNextPosition() {
        const nodes = this.getNodes();
        const index = nodes.length;
        return {
            x: 100 + (index % 3) * 280,
            y: 50 + Math.floor(index / 3) * 200
        };
    },

    /**
     * Получить статистику
     * @returns {Object}
     */
    getStats() {
        const nodes = this.getNodes();
        return {
            total: nodes.length,
            byStatus: nodes.reduce((acc, n) => {
                const status = n.data?.status || 'unknown';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {})
        };
    }
};

// Экспортировать глобально
window.SessionFlowStorage = SessionFlowStorage;

console.log('SessionFlowStorage initialized');
