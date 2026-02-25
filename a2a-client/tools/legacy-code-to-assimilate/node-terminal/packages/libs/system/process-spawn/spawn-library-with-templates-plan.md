# SPAWN LIBRARY: Готовая библиотека с шаблонами и тестами

## 🎯 **АНАЛИЗ КРОСПЛАТФОРМЕННЫХ ВАРИАНТОВ**

### **1. Node.js child_process (САМЫЙ ПРОСТОЙ)**
**ПРЕИМУЩЕСТВА:**
- ✅ Встроенный в Node.js
- ✅ Кроссплатформенный
- ✅ Простой API
- ✅ Хорошая документация
- ✅ Поддержка Windows/Linux/macOS

**НЕДОСТАТКИ:**
- ❌ Базовый функционал
- ❌ Нет встроенного мониторинга

### **2. Python subprocess (АЛЬТЕРНАТИВА)**
**ПРЕИМУЩЕСТВА:**
- ✅ Встроенный в Python
- ✅ Кроссплатформенный
- ✅ Мощный API
- ✅ Хорошая обработка ошибок

**НЕДОСТАТКИ:**
- ❌ Требует Python
- ❌ Сложнее для интеграции

### **3. Go os/exec (ПРОИЗВОДИТЕЛЬНЫЙ)**
**ПРЕИМУЩЕСТВА:**
- ✅ Высокая производительность
- ✅ Кроссплатформенный
- ✅ Компилируется в бинарник

**НЕДОСТАТКИ:**
- ❌ Требует компиляции
- ❌ Сложнее для разработки

## 🏆 **ВЫБОР: Node.js child_process**

**ПРИЧИНА:** Самый простой и кроссплатформенный вариант для интеграции с существующими библиотеками.

## 📁 **СТРУКТУРА БИБЛИОТЕКИ**

```
libs/system/spawn-templates/
├── src/
│   ├── core/
│   │   ├── SpawnManager.js          # Основной менеджер
│   │   ├── ProcessTemplate.js       # Базовый шаблон
│   │   ├── ProcessMonitor.js        # Мониторинг процессов
│   │   └── ProcessKiller.js         # Graceful shutdown
│   ├── templates/
│   │   ├── nodejs/
│   │   │   ├── PM2Template.js       # PM2 шаблон
│   │   │   ├── NodemonTemplate.js   # Nodemon шаблон
│   │   │   ├── ForeverTemplate.js   # Forever шаблон
│   │   │   └── ClusterTemplate.js   # Cluster шаблон
│   │   ├── python/
│   │   │   ├── SupervisorTemplate.js # Supervisor шаблон
│   │   │   ├── GunicornTemplate.js  # Gunicorn шаблон
│   │   │   ├── UvicornTemplate.js   # Uvicorn шаблон
│   │   │   └── CeleryTemplate.js    # Celery шаблон
│   │   ├── php/
│   │   │   ├── PHPFPMTemplate.js    # PHP-FPM шаблон
│   │   │   ├── LaravelTemplate.js   # Laravel шаблон
│   │   │   └── SymfonyTemplate.js   # Symfony шаблон
│   │   ├── java/
│   │   │   ├── SpringBootTemplate.js # Spring Boot шаблон
│   │   │   ├── TomcatTemplate.js    # Tomcat шаблон
│   │   │   └── JettyTemplate.js     # Jetty шаблон
│   │   └── system/
│   │       ├── SystemdTemplate.js   # Systemd шаблон
│   │       ├── DockerTemplate.js    # Docker шаблон
│   │       └── KubernetesTemplate.js # Kubernetes шаблон
│   ├── config/
│   │   ├── SpawnConfig.js           # Конфигурация
│   │   ├── TemplateConfig.js        # Конфигурация шаблонов
│   │   └── defaults.js              # Значения по умолчанию
│   └── utils/
│       ├── PlatformUtils.js         # Утилиты для платформ
│       ├── PathUtils.js             # Утилиты для путей
│       └── ValidationUtils.js       # Валидация
├── tests/
│   ├── unit/
│   │   ├── SpawnManager.test.js
│   │   ├── ProcessTemplate.test.js
│   │   ├── ProcessMonitor.test.js
│   │   └── ProcessKiller.test.js
│   ├── integration/
│   │   ├── templates/
│   │   │   ├── nodejs/
│   │   │   │   ├── PM2Template.test.js
│   │   │   │   ├── NodemonTemplate.test.js
│   │   │   │   └── ForeverTemplate.test.js
│   │   │   ├── python/
│   │   │   │   ├── SupervisorTemplate.test.js
│   │   │   │   └── GunicornTemplate.test.js
│   │   │   ├── php/
│   │   │   │   ├── PHPFPMTemplate.test.js
│   │   │   │   └── LaravelTemplate.test.js
│   │   │   └── system/
│   │   │       ├── SystemdTemplate.test.js
│   │   │       └── DockerTemplate.test.js
│   │   └── cross-platform/
│   │       ├── Windows.test.js
│   │       ├── Linux.test.js
│   │       └── macOS.test.js
│   └── fixtures/
│       ├── nodejs/
│       │   ├── simple-app.js
│       │   ├── package.json
│       │   └── ecosystem.config.js
│       ├── python/
│       │   ├── simple-app.py
│       │   ├── requirements.txt
│       │   └── supervisord.conf
│       ├── php/
│       │   ├── simple-app.php
│       │   ├── composer.json
│       │   └── php.ini
│       └── java/
│           ├── SimpleApp.java
│           ├── pom.xml
│           └── application.properties
├── examples/
│   ├── basic-usage.js
│   ├── pm2-example.js
│   ├── supervisor-example.js
│   ├── docker-example.js
│   └── cross-platform-example.js
├── docs/
│   ├── README.md
│   ├── API.md
│   ├── TEMPLATES.md
│   ├── TESTING.md
│   └── EXAMPLES.md
├── package.json
├── index.js
└── .gitignore
```

## 🔧 **ОСНОВНЫЕ КОМПОНЕНТЫ**

### **1. SpawnManager.js - Основной менеджер**
```javascript
const { spawn } = require('child_process');
const { ProcessTemplate } = require('./ProcessTemplate');
const { ProcessMonitor } = require('./ProcessMonitor');
const { ProcessKiller } = require('./ProcessKiller');

class SpawnManager {
  constructor(options = {}) {
    this.options = {
      timeout: 30000,
      maxRetries: 3,
      autoRestart: false,
      ...options
    };
    this.processes = new Map();
    this.monitor = new ProcessMonitor();
    this.killer = new ProcessKiller();
  }

  async spawnFromTemplate(templateName, config) {
    const template = this.loadTemplate(templateName);
    const processConfig = template.generateConfig(config);
    return await this.spawnProcess(processConfig);
  }

  async spawnProcess(config) {
    const { command, args, cwd, env, timeout } = config;
    
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const processId = this.generateProcessId();
      this.processes.set(processId, {
        process,
        config,
        startTime: Date.now(),
        status: 'running'
      });

      // Обработка событий
      process.on('error', (error) => {
        this.handleProcessError(processId, error);
        reject(error);
      });

      process.on('exit', (code, signal) => {
        this.handleProcessExit(processId, code, signal);
        resolve({ processId, code, signal });
      });

      // Таймаут
      if (timeout) {
        setTimeout(() => {
          this.killProcess(processId);
        }, timeout);
      }
    });
  }

  async killProcess(processId) {
    const processInfo = this.processes.get(processId);
    if (processInfo) {
      await this.killer.killGracefully(processInfo.process);
      this.processes.delete(processId);
    }
  }

  getProcessStatus(processId) {
    const processInfo = this.processes.get(processId);
    if (processInfo) {
      return {
        processId,
        status: processInfo.status,
        startTime: processInfo.startTime,
        uptime: Date.now() - processInfo.startTime,
        config: processInfo.config
      };
    }
    return null;
  }

  getAllProcesses() {
    return Array.from(this.processes.keys()).map(id => 
      this.getProcessStatus(id)
    );
  }
}
```

### **2. ProcessTemplate.js - Базовый шаблон**
```javascript
class ProcessTemplate {
  constructor(name, options = {}) {
    this.name = name;
    this.options = {
      command: '',
      defaultArgs: [],
      defaultEnv: {},
      defaultCwd: process.cwd(),
      timeout: 30000,
      maxRetries: 3,
      autoRestart: false,
      ...options
    };
  }

  generateConfig(userConfig = {}) {
    return {
      command: userConfig.command || this.options.command,
      args: [...this.options.defaultArgs, ...(userConfig.args || [])],
      cwd: userConfig.cwd || this.options.defaultCwd,
      env: { ...this.options.defaultEnv, ...userConfig.env },
      timeout: userConfig.timeout || this.options.timeout,
      maxRetries: userConfig.maxRetries || this.options.maxRetries,
      autoRestart: userConfig.autoRestart !== undefined ? userConfig.autoRestart : this.options.autoRestart
    };
  }

  validateConfig(config) {
    const errors = [];
    
    if (!config.command) {
      errors.push('Command is required');
    }
    
    if (!config.cwd) {
      errors.push('Working directory is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  getDefaultConfig() {
    return this.options;
  }
}
```

### **3. PM2Template.js - Пример шаблона**
```javascript
const { ProcessTemplate } = require('../core/ProcessTemplate');
const { PlatformUtils } = require('../utils/PlatformUtils');

class PM2Template extends ProcessTemplate {
  constructor() {
    super('pm2', {
      command: 'pm2',
      defaultArgs: ['start'],
      defaultEnv: {
        NODE_ENV: 'production'
      },
      timeout: 60000,
      maxRetries: 3,
      autoRestart: true
    });
  }

  generateConfig(userConfig = {}) {
    const baseConfig = super.generateConfig(userConfig);
    
    // PM2 специфичная логика
    const pm2Args = [...baseConfig.args];
    
    if (userConfig.script) {
      pm2Args.push(userConfig.script);
    }
    
    if (userConfig.name) {
      pm2Args.push('--name', userConfig.name);
    }
    
    if (userConfig.instances) {
      pm2Args.push('--instances', userConfig.instances.toString());
    }
    
    if (userConfig.execMode) {
      pm2Args.push('--exec-mode', userConfig.execMode);
    }
    
    return {
      ...baseConfig,
      args: pm2Args
    };
  }

  validateConfig(config) {
    const baseValidation = super.validateConfig(config);
    
    if (!baseValidation.isValid) {
      return baseValidation;
    }
    
    const errors = [];
    
    if (!config.script && !config.name) {
      errors.push('PM2 requires either script or name');
    }
    
    if (config.instances && (isNaN(config.instances) || config.instances < 1)) {
      errors.push('Instances must be a positive number');
    }
    
    return {
      isValid: errors.length === 0,
      errors: [...baseValidation.errors, ...errors]
    };
  }
}
```

## 🧪 **ТЕСТИРОВАНИЕ**

### **1. Unit тесты**
```javascript
// tests/unit/SpawnManager.test.js
const { SpawnManager } = require('../../src/core/SpawnManager');

describe('SpawnManager', () => {
  let spawnManager;

  beforeEach(() => {
    spawnManager = new SpawnManager();
  });

  afterEach(() => {
    // Очистка процессов
    spawnManager.getAllProcesses().forEach(process => {
      spawnManager.killProcess(process.processId);
    });
  });

  test('should spawn process successfully', async () => {
    const config = {
      command: 'node',
      args: ['-e', 'console.log("test")'],
      cwd: process.cwd()
    };

    const result = await spawnManager.spawnProcess(config);
    expect(result.processId).toBeDefined();
    expect(result.code).toBe(0);
  });

  test('should handle process errors', async () => {
    const config = {
      command: 'nonexistent-command',
      args: [],
      cwd: process.cwd()
    };

    await expect(spawnManager.spawnProcess(config)).rejects.toThrow();
  });

  test('should kill process gracefully', async () => {
    const config = {
      command: 'node',
      args: ['-e', 'setInterval(() => {}, 1000)'],
      cwd: process.cwd()
    };

    const result = await spawnManager.spawnProcess(config);
    await spawnManager.killProcess(result.processId);
    
    const status = spawnManager.getProcessStatus(result.processId);
    expect(status).toBeNull();
  });
});
```

### **2. Integration тесты**
```javascript
// tests/integration/templates/nodejs/PM2Template.test.js
const { SpawnManager } = require('../../../src/core/SpawnManager');
const { PM2Template } = require('../../../src/templates/nodejs/PM2Template');

describe('PM2Template Integration', () => {
  let spawnManager;
  let pm2Template;

  beforeEach(() => {
    spawnManager = new SpawnManager();
    pm2Template = new PM2Template();
  });

  test('should generate valid PM2 config', () => {
    const userConfig = {
      script: 'app.js',
      name: 'test-app',
      instances: 2,
      execMode: 'cluster'
    };

    const config = pm2Template.generateConfig(userConfig);
    const validation = pm2Template.validateConfig(config);

    expect(validation.isValid).toBe(true);
    expect(config.command).toBe('pm2');
    expect(config.args).toContain('start');
    expect(config.args).toContain('app.js');
    expect(config.args).toContain('--name');
    expect(config.args).toContain('test-app');
  });

  test('should spawn PM2 process', async () => {
    const config = {
      script: 'tests/fixtures/nodejs/simple-app.js',
      name: 'test-pm2-app'
    };

    const result = await spawnManager.spawnFromTemplate('pm2', config);
    expect(result.processId).toBeDefined();
    
    // Проверяем статус
    const status = spawnManager.getProcessStatus(result.processId);
    expect(status.status).toBe('running');
  });
});
```

### **3. Cross-platform тесты**
```javascript
// tests/integration/cross-platform/Windows.test.js
const { SpawnManager } = require('../../../src/core/SpawnManager');
const { PlatformUtils } = require('../../../src/utils/PlatformUtils');

describe('Windows Compatibility', () => {
  let spawnManager;

  beforeEach(() => {
    spawnManager = new SpawnManager();
  });

  test('should handle Windows paths correctly', () => {
    const windowsPath = 'C:\\Users\\test\\app.js';
    const normalizedPath = PlatformUtils.normalizePath(windowsPath);
    
    expect(normalizedPath).toBe('C:/Users/test/app.js');
  });

  test('should spawn Windows processes', async () => {
    const config = {
      command: 'cmd',
      args: ['/c', 'echo', 'Hello Windows'],
      cwd: process.cwd()
    };

    const result = await spawnManager.spawnProcess(config);
    expect(result.code).toBe(0);
  });
});
```

## 📦 **ПАКЕТ И КОНФИГУРАЦИЯ**

### **package.json**
```json
{
  "name": "@libs/system/spawn-templates",
  "version": "1.0.0",
  "description": "Cross-platform process spawning with templates",
  "main": "index.js",
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:cross-platform": "jest tests/integration/cross-platform",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/ tests/",
    "build": "babel src/ -d dist/",
    "docs": "jsdoc src/ -d docs/api"
  },
  "keywords": [
    "spawn",
    "process",
    "templates",
    "cross-platform",
    "pm2",
    "supervisor",
    "docker"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "child_process": "^1.0.2",
    "path": "^0.12.7",
    "os": "^0.1.2"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "babel-cli": "^7.0.0",
    "babel-preset-env": "^7.0.0",
    "jsdoc": "^4.0.0"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

## 🚀 **ПЛАН РЕАЛИЗАЦИИ**

### **Неделя 1: Основные компоненты**
- [ ] SpawnManager.js
- [ ] ProcessTemplate.js
- [ ] ProcessMonitor.js
- [ ] ProcessKiller.js
- [ ] Базовые утилиты

### **Неделя 2: Шаблоны Node.js**
- [ ] PM2Template.js
- [ ] NodemonTemplate.js
- [ ] ForeverTemplate.js
- [ ] ClusterTemplate.js
- [ ] Тесты для Node.js шаблонов

### **Неделя 3: Шаблоны Python/PHP/Java**
- [ ] SupervisorTemplate.js
- [ ] GunicornTemplate.js
- [ ] PHPFPMTemplate.js
- [ ] SpringBootTemplate.js
- [ ] Тесты для всех шаблонов

### **Неделя 4: Системные шаблоны и документация**
- [ ] SystemdTemplate.js
- [ ] DockerTemplate.js
- [ ] KubernetesTemplate.js
- [ ] Cross-platform тесты
- [ ] Документация и примеры

## 🎯 **ПРЕИМУЩЕСТВА РЕШЕНИЯ**

### **1. Простота**
- Минимальные зависимости
- Простой API
- Легкая интеграция

### **2. Кроссплатформенность**
- Работает на Windows/Linux/macOS
- Автоматическое определение платформы
- Нормализация путей

### **3. Готовые шаблоны**
- PM2, Supervisor, Docker и др.
- Легко расширяемые
- Хорошо протестированные

### **4. Надежность**
- Graceful shutdown
- Обработка ошибок
- Мониторинг процессов

**Готов начать реализацию! С какого компонента начнем?**
