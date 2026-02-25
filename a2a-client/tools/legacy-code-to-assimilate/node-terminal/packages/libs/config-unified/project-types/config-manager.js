const fs = require('fs').promises;
const path = require('path');
const { readFileSync, existsSync } = require('fs');
const { ConfigManager } = require('../../config-manager/index.cjs');

class ProjectTypesConfigManager extends ConfigManager {
  constructor(configPath, schemaPath) {
    super(configPath, schemaPath);
    this.configName = 'project-types';
    this.defaultConfig = this.getDefaultConfig();
  }

  getDefaultConfig() {
    return {
      projectTypes: {
        node: {
          name: 'Node.js Project',
          detection: {
            files: ['package.json'],
            dependencies: ['express', 'react', 'vue']
          },
          config: {
            port: 3000,
            startCommand: 'npm start',
            statusCheck: '/status',
            startScriptPatterns: ['start', 'dev']
          }
        },
        vue: {
          name: 'Vue.js Project',
          detection: {
            files: ['package.json'],
            dependencies: ['vue', 'vite']
          },
          config: {
            port: 8080,
            startCommand: 'npm run dev',
            statusCheck: '/',
            startScriptPatterns: ['dev', 'serve']
          }
        },
        react: {
          name: 'React Project',
          detection: {
            files: ['package.json'],
            dependencies: ['react', 'react-dom']
          },
          config: {
            port: 3000,
            startCommand: 'npm start',
            statusCheck: '/',
            startScriptPatterns: ['start']
          }
        },
        vite: {
          name: 'Vite Project',
          detection: {
            files: ['vite.config.js', 'package.json'],
            dependencies: ['vite']
          },
          config: {
            port: 5173,
            startCommand: 'npm run dev',
            statusCheck: '/',
            startScriptPatterns: ['dev']
          }
        },
        php: {
          name: 'PHP Project',
          detection: {
            files: ['composer.json', 'index.php'],
            dependencies: []
          },
          config: {
            port: 8000,
            startCommand: 'php -S localhost:8000',
            statusCheck: '/',
            startScriptPatterns: ['serve']
          }
        },
        python: {
          name: 'Python Project',
          detection: {
            files: ['requirements.txt', 'main.py'],
            dependencies: []
          },
          config: {
            port: 5000,
            startCommand: 'python app.py',
            statusCheck: '/status',
            startScriptPatterns: ['start', 'run']
          }
        },
        java: {
          name: 'Java Project',
          detection: {
            files: ['pom.xml', 'build.gradle', 'src/main/java'],
            dependencies: []
          },
          config: {
            port: 8080,
            startCommand: 'mvn spring-boot:run',
            statusCheck: '/actuator/status',
            startScriptPatterns: ['run', 'bootRun']
          }
        }
      },
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Конфигурация типов проектов'
      }
    };
  }

  async getAllProjectTypes() {
    const config = await this.getConfig();
    return config.projectTypes;
  }

  async getProjectType(typeId) {
    const config = await this.getConfig();
    return config.projectTypes[typeId];
  }

  async getProjectDetectionFiles(typeId) {
    const config = await this.getConfig();
    return config.projectTypes[typeId]?.detection?.files || [];
  }

  async getProjectDetectionDependencies(typeId) {
    const config = await this.getConfig();
    return config.projectTypes[typeId]?.detection?.dependencies || [];
  }

  async getProjectConfigPort(typeId) {
    const config = await this.getConfig();
    return config.projectTypes[typeId]?.config?.port;
  }

  async getProjectConfigStartCommand(typeId) {
    const config = await this.getConfig();
    return config.projectTypes[typeId]?.config?.startCommand;
  }

  async getProjectConfigStartScriptPatterns(typeId) {
    const config = await this.getConfig();
    return config.projectTypes[typeId]?.config?.startScriptPatterns || [];
  }
}

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const projectTypesConfigManager = new ProjectTypesConfigManager(configPath, schemaPath);

module.exports = projectTypesConfigManager;
