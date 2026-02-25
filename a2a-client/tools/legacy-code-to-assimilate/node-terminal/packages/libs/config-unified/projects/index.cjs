const path = require('path');
const fs = require('fs').promises;
const { ConfigManagerWrapper } = require('../../core/UnifiedConfigManager.cjs'); // Assuming UnifiedConfigManager exists

class ProjectsConfigManager extends ConfigManagerWrapper {
    constructor(configPath, schemaPath, testMode = false, initialConfig = null) {
        super(configPath, schemaPath, testMode, initialConfig);
        this.configName = 'projects';
        this.defaultConfig = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            projects: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Configuration for projects'
            }
        };
    }

    async getProject(id) {
        const config = await this.getConfig();
        return config.projects?.find(p => p.id === id) || null;
    }

    async getAllProjects() {
        const config = await this.getConfig();
        return config.projects || [];
    }

    async addProject(projectConfig) {
        const config = await this.getConfig();
        if (config.projects.some(p => p.id === projectConfig.id)) {
            throw new Error(`Project with ID ${projectConfig.id} already exists.`);
        }
        config.projects.push({ ...projectConfig, created: new Date().toISOString() });
        await this.saveConfig(config);
        return projectConfig;
    }

    async updateProject(id, updates) {
        const config = await this.getConfig();
        const index = config.projects?.findIndex(p => p.id === id);
        if (index !== -1 && config.projects && config.projects[index]) {
            Object.assign(config.projects[index], { ...updates, updated: new Date().toISOString() });
            await this.saveConfig(config);
            return config.projects[index];
        }
        throw new Error(`Project with ID ${id} not found.`);
    }

    async deleteProject(id) {
        const config = await this.getConfig();
        const initialLength = config.projects.length;
        config.projects = config.projects.filter(p => p.id !== id);
        if (config.projects.length === initialLength) {
            throw new Error(`Project with ID ${id} not found.`);
        }
        await this.saveConfig(config);
        return { success: true };
    }
}

const configPath = path.join(__dirname, 'storage/data/config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const projectsConfigManager = new ProjectsConfigManager(configPath, schemaPath, true);

module.exports = { ProjectsConfigManager, projectsConfigManager };

