const path = require('path');
const fs = require('fs').promises;
const { ConfigManagerWrapper } = require('../../core/UnifiedConfigManager.cjs');

class GatewayConfigManager extends ConfigManagerWrapper {
    constructor(configPath, schemaPath, testMode = false, initialConfig = null) {
        super(configPath, schemaPath, testMode, initialConfig);
        this.entityName = 'rules'; // The key in the config where rules are stored
    }

    getDefaultConfig() {
        return {
            rules: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Initial gateway routing rules configuration'
            }
        };
    }

    /**
     * Retrieves a single gateway rule by its ID.
     * @param {string} id - The unique ID of the rule.
     * @returns {Promise<object|null>} The rule object if found, otherwise null.
     */
    async getRule(id) {
        const config = await this.readConfig();
        return config[this.entityName].find(rule => rule.id === id) || null;
    }

    /**
     * Retrieves all gateway rules.
     * @returns {Promise<Array<object>>} An array of all gateway rules.
     */
    async getAllRules() {
        const config = await this.readConfig();
        return config[this.entityName];
    }

    /**
     * Adds a new gateway rule.
     * @param {object} ruleConfig - The rule configuration to add.
     * @returns {Promise<object>} The newly added rule.
     * @throws {Error} If a rule with the same ID already exists.
     */
    async addRule(ruleConfig) {
        const config = await this.readConfig();
        if (config[this.entityName].some(rule => rule.id === ruleConfig.id)) {
            throw new Error(`Gateway rule with ID '${ruleConfig.id}' already exists.`);
        }
        const newRule = { ...ruleConfig, created: new Date().toISOString(), updated: new Date().toISOString() };
        config[this.entityName].push(newRule);
        await this.writeConfig(config);
        return newRule;
    }

    /**
     * Updates an existing gateway rule.
     * @param {string} id - The ID of the rule to update.
     * @param {object} updates - An object containing the updates to apply.
     * @returns {Promise<object>} The updated rule.
     * @throws {Error} If the rule with the specified ID is not found.
     */
    async updateRule(id, updates) {
        const config = await this.readConfig();
        const index = config[this.entityName].findIndex(rule => rule.id === id);
        if (index === -1) {
            throw new Error(`Gateway rule with ID '${id}' not found.`);
        }
        const updatedRule = { ...config[this.entityName][index], ...updates, updated: new Date().toISOString() };
        config[this.entityName][index] = updatedRule;
        await this.writeConfig(config);
        return updatedRule;
    }

    /**
     * Deletes a gateway rule by its ID.
     * @param {string} id - The ID of the rule to delete.
     * @returns {Promise<boolean>} True if the rule was deleted, false otherwise.
     * @throws {Error} If the rule with the specified ID is not found.
     */
    async deleteRule(id) {
        const config = await this.readConfig();
        const initialLength = config[this.entityName].length;
        config[this.entityName] = config[this.entityName].filter(rule => rule.id !== id);
        if (config[this.entityName].length === initialLength) {
            throw new Error(`Gateway rule with ID '${id}' not found for deletion.`);
        }
        await this.writeConfig(config);
        return true;
    }
}

const configPath = path.join(__dirname, 'storage/data/config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const gatewayConfigManager = new GatewayConfigManager(configPath, schemaPath, true);

module.exports = { GatewayConfigManager, gatewayConfigManager };

