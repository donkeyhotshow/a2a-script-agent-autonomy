#!/usr/bin/env node

/**
 * CLI интерфейс для управления сервисами
 * Использование: node cli.js [команда] [опции]
 */

const path = require('path');
const fs = require('fs').promises;
const { ServiceManagementUtils } = require('./index');

class ServiceManagementCLI {
    constructor() {
        this.configPath = path.join(__dirname, 'config', 'services.json');
        this.serviceManager = new ServiceManagementUtils({
            logger: {
                info: (msg) => console.log(`[INFO] ${msg}`),
                error: (msg) => console.error(`[ERROR] ${msg}`),
                debug: (msg) => console.log(`[DEBUG] ${msg}`),
                warn: (msg) => console.warn(`[WARN] ${msg}`)
            }
        });
    }

    async loadConfig() {
        try {
            // ServiceManager уже загрузил конфигурацию при инициализации
            // Просто читаем файл для отображения
            const configData = await fs.readFile(this.configPath, 'utf8');
            const config = JSON.parse(configData);
            return config;
        } catch (error) {
            console.error(`[ERROR] Failed to load config: ${error.message}`);
            return null;
        }
    }

    async listServices() {
        const config = await this.loadConfig();
        if (!config) return;

        console.log('\n📋 Available Services:\n');
        
        for (const [id, service] of Object.entries(config.services)) {
            const status = service.status || 'stopped';
            const enabled = service.enabled ? '✅' : '❌';
            const autostart = service.autostart ? '🚀' : '⏸️';
            const group = service.group || 'none';
            
            console.log(`${enabled} ${id} (${service.name})`);
            console.log(`   Status: ${status} | Group: ${group} | Autostart: ${autostart}`);
            console.log(`   Type: ${service.type || 'unknown'} | Port: ${service.startCommands?.[0]?.port || 'N/A'}`);
            console.log('');
        }

        console.log('\n📊 Groups:\n');
        for (const [id, group] of Object.entries(config.groups)) {
            const autoStart = group.autoStart ? '🚀' : '⏸️';
            const enabled = group.enabled ? '✅' : '❌';
            console.log(`${enabled} ${id}: ${group.name} ${autoStart}`);
            console.log(`   Services: ${group.services?.join(', ') || 'none'}`);
            console.log('');
        }
    }

    async startService(serviceId) {
        const config = await this.loadConfig();
        if (!config || !config.services[serviceId]) {
            console.error(`[ERROR] Service '${serviceId}' not found`);
            return;
        }

        console.log(`[INFO] Starting service: ${serviceId}`);
        try {
            const result = await this.serviceManager.startService(serviceId, config.services[serviceId]);
            if (result.success) {
                console.log(`[SUCCESS] Service '${serviceId}' started successfully`);
            } else {
                console.error(`[ERROR] Failed to start service '${serviceId}': ${result.error}`);
            }
        } catch (error) {
            console.error(`[ERROR] Error starting service '${serviceId}': ${error.message}`);
        }
    }

    async stopService(serviceId) {
        const config = await this.loadConfig();
        if (!config || !config.services[serviceId]) {
            console.error(`[ERROR] Service '${serviceId}' not found`);
            return;
        }

        console.log(`[INFO] Stopping service: ${serviceId}`);
        try {
            const result = await this.serviceManager.stopService(serviceId);
            if (result.success) {
                console.log(`[SUCCESS] Service '${serviceId}' stopped successfully`);
            } else {
                console.error(`[ERROR] Failed to stop service '${serviceId}': ${result.error}`);
            }
        } catch (error) {
            console.error(`[ERROR] Error stopping service '${serviceId}': ${error.message}`);
        }
    }

    async restartService(serviceId) {
        const config = await this.loadConfig();
        if (!config || !config.services[serviceId]) {
            console.error(`[ERROR] Service '${serviceId}' not found`);
            return;
        }

        console.log(`[INFO] Restarting service: ${serviceId}`);
        try {
            const result = await this.serviceManager.restartService(serviceId);
            if (result.success) {
                console.log(`[SUCCESS] Service '${serviceId}' restarted successfully`);
            } else {
                console.error(`[ERROR] Failed to restart service '${serviceId}': ${result.error}`);
            }
        } catch (error) {
            console.error(`[ERROR] Error restarting service '${serviceId}': ${error.message}`);
        }
    }

    async getServiceStatus(serviceId) {
        const config = await this.loadConfig();
        if (!config || !config.services[serviceId]) {
            console.error(`[ERROR] Service '${serviceId}' not found`);
            return;
        }

        try {
            const status = await this.serviceManager.getServiceStatus(serviceId);
            console.log(`\n📊 Status for service: ${serviceId}\n`);
            console.log(`Status: ${status.status}`);
            console.log(`Process Running: ${status.processRunning ? 'Yes' : 'No'}`);
            console.log(`Port Listening: ${status.isListening ? 'Yes' : 'No'}`);
            if (status.pid) console.log(`PID: ${status.pid}`);
            if (status.startTime) console.log(`Start Time: ${new Date(status.startTime).toISOString()}`);
            if (status.uptime) console.log(`Uptime: ${Math.round(status.uptime / 1000)}s`);
            if (status.health) console.log(`Health: ${status.health.ok ? 'OK' : 'Failed'} - ${status.health.message}`);
        } catch (error) {
            console.error(`[ERROR] Error getting status for service '${serviceId}': ${error.message}`);
        }
    }

    async getAllStatuses() {
        const config = await this.loadConfig();
        if (!config) return;

        console.log('\n📊 All Services Status:\n');
        
        for (const [id, service] of Object.entries(config.services)) {
            try {
                const status = await this.serviceManager.getServiceStatus(id);
                const statusIcon = status.status === 'running' ? '🟢' : 
                                 status.status === 'starting' ? '🟡' : 
                                 status.status === 'stopped' ? '🔴' : '⚪';
                
                console.log(`${statusIcon} ${id}: ${status.status}`);
                if (status.pid) console.log(`   PID: ${status.pid}`);
                if (status.isListening !== null) console.log(`   Port: ${status.isListening ? 'Listening' : 'Not Listening'}`);
                console.log('');
            } catch (error) {
                console.log(`❌ ${id}: Error - ${error.message}`);
            }
        }
    }

    async autostart(group = null) {
        const config = await this.loadConfig();
        if (!config) return;

        console.log(`[INFO] Starting autostart process${group ? ` for group: ${group}` : ''}`);
        try {
            const result = await this.serviceManager.autostart(group);
            if (result.success) {
                console.log(`[SUCCESS] Autostart completed. Started ${result.started} services.`);
            } else {
                console.error(`[ERROR] Autostart failed: ${result.error}`);
            }
        } catch (error) {
            console.error(`[ERROR] Error during autostart: ${error.message}`);
        }
    }

    async showConfig() {
        try {
            const configData = await fs.readFile(this.configPath, 'utf8');
            const config = JSON.parse(configData);
            console.log('\n⚙️  Configuration:\n');
            console.log(JSON.stringify(config, null, 2));
        } catch (error) {
            console.error(`[ERROR] Failed to read config: ${error.message}`);
        }
    }

    async editConfig() {
        console.log(`[INFO] Opening config file: ${this.configPath}`);
        console.log('[INFO] Please edit the file manually and save it.');
        console.log('[INFO] The changes will take effect after restarting the service manager.');
    }

    showHelp() {
        console.log(`
🔧 Service Management CLI

Usage: node cli.js [command] [options]

Commands:
  list                    List all available services and groups
  start <service-id>      Start a specific service
  stop <service-id>       Stop a specific service
  restart <service-id>    Restart a specific service
  status [service-id]     Show status of services (all or specific)
  autostart [group]       Start all autostart services (optionally for specific group)
  config                  Show current configuration
  edit                    Open config file for editing
  help                    Show this help message

Examples:
  node cli.js list
  node cli.js start projects-manager-ui
  node cli.js status projects-manager-ui
  node cli.js autostart development
  node cli.js config

Groups:
  development             Development environment services
  production              Production environment services
  automation              Automation tools
  testing                 Testing services
  ai                      AI services
  tools                   Development tools
        `);
    }

    async run() {
        const args = process.argv.slice(2);
        const command = args[0];

        if (!command || command === 'help') {
            this.showHelp();
            return;
        }

        try {
            switch (command) {
                case 'list':
                    await this.listServices();
                    break;
                    
                case 'start':
                    if (!args[1]) {
                        console.error('[ERROR] Service ID required for start command');
                        return;
                    }
                    await this.startService(args[1]);
                    break;
                    
                case 'stop':
                    if (!args[1]) {
                        console.error('[ERROR] Service ID required for stop command');
                        return;
                    }
                    await this.stopService(args[1]);
                    break;
                    
                case 'restart':
                    if (!args[1]) {
                        console.error('[ERROR] Service ID required for restart command');
                        return;
                    }
                    await this.restartService(args[1]);
                    break;
                    
                case 'status':
                    if (args[1]) {
                        await this.getServiceStatus(args[1]);
                    } else {
                        await this.getAllStatuses();
                    }
                    break;
                    
                case 'autostart':
                    await this.autostart(args[1]);
                    break;
                    
                case 'config':
                    await this.showConfig();
                    break;
                    
                case 'edit':
                    await this.editConfig();
                    break;
                    
                default:
                    console.error(`[ERROR] Unknown command: ${command}`);
                    this.showHelp();
                    break;
            }
        } catch (error) {
            console.error(`[ERROR] Command execution failed: ${error.message}`);
        }
    }
}

// Запуск CLI если файл вызван напрямую
if (require.main === module) {
    const cli = new ServiceManagementCLI();
    cli.run().catch(error => {
        console.error(`[FATAL] CLI execution failed: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { ServiceManagementCLI };
