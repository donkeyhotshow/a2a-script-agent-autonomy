# Service Management Library

Библиотека для управления жизненным циклом сервисов, их мониторингом и автозапуском.

## 🚀 Возможности

- **Управление сервисами**: Запуск, остановка, перезапуск
- **Автозапуск**: Автоматический запуск сервисов по группам
- **Мониторинг**: Проверка состояния и здоровья сервисов
- **CLI интерфейс**: Удобное управление из командной строки
- **Интеграционный слой**: Богатый API для UI, форм и внешних систем
- **Конфигурация**: Гибкая настройка через JSON файлы

## 📁 Структура

```
service-management/
├── index.js              # Основная библиотека
├── integration.js        # Интеграционный слой (API, формы, UI)
├── cli.js                # CLI интерфейс
├── service-cli.bat       # Windows batch файл
├── service-cli.ps1       # PowerShell скрипт
├── examples.js           # Примеры использования
├── config/
│   └── services.json     # Конфигурация сервисов
└── README.md             # Документация
```

## 🛠️ Установка и использование

### 1. Использование в коде

```javascript
const { ServiceManagementUtils } = require('@libs/system/service-management');

const serviceManager = new ServiceManagementUtils({
    logger: console,
    // другие опции...
});

// Загрузка конфигурации
await serviceManager.loadServicesFromConfig(config);

// Запуск сервиса
await serviceManager.startService('service-id', serviceConfig);

// Автозапуск группы
await serviceManager.autostart('development');
```

### 2. Использование интеграционного слоя

```javascript
const { ServiceManagementIntegration } = require('@libs/system/service-management/integration');

const integration = new ServiceManagementIntegration({
    uiFramework: 'react', // или 'vue', 'html', 'angular'
    theme: 'dark',
    language: 'ru'
});

// Получение данных в разных форматах
const services = await integration.getServicesData('flat');
const groupedServices = await integration.getServicesData('grouped');
const stats = await integration.getServicesStats();

// Работа с формами
const createForm = integration.getServiceForm('create');
const editForm = integration.getServiceForm('edit', 'service-id');

// Создание и управление сервисами
await integration.createService(serviceData);
await integration.updateService('service-id', updateData);
await integration.deleteService('service-id');

// Подписка на события
integration.on('service:created', (service) => {
    console.log('Сервис создан:', service.id);
});
```

### 2. CLI интерфейс

#### Windows (Batch)
```cmd
# Список сервисов
service-cli.bat list

# Запуск сервиса
service-cli.bat start projects-manager-ui

# Статус сервиса
service-cli.bat status projects-manager-ui

# Автозапуск группы
service-cli.bat autostart development
```

#### PowerShell
```powershell
# Список сервисов
.\service-cli.ps1 list

# Запуск сервиса
.\service-cli.ps1 start projects-manager-ui

# Статус сервиса
.\service-cli.ps1 status projects-manager-ui

# Автозапуск группы
.\service-cli.ps1 autostart development
```

#### Node.js напрямую
```bash
# Список сервисов
node cli.js list

# Запуск сервиса
node cli.js start projects-manager-ui

# Статус сервиса
node cli.js status projects-manager-ui

# Автозапуск группы
node cli.js autostart development
```

## 🔌 Интеграционный слой

### API для получения данных

```javascript
// Различные форматы данных
const flat = await integration.getServicesData('flat');        // Плоский список
const grouped = await integration.getServicesData('grouped');  // По группам
const hierarchical = await integration.getServicesData('hierarchical'); // Иерархический
const api = await integration.getServicesData('api');         // API формат

// Конкретный сервис
const service = await integration.getServiceData('service-id', true);

// Статистика
const stats = await integration.getServicesStats();
```

### Формы для UI

```javascript
// Форма создания сервиса
const createForm = integration.getServiceForm('create');

// Форма редактирования
const editForm = integration.getServiceForm('edit', 'service-id');

// Форма группы
const groupForm = integration.getGroupForm('create');
```

### Валидация данных

```javascript
// Валидация сервиса
const validation = integration.validateServiceData(serviceData);
if (!validation.isValid) {
    console.log('Ошибки:', validation.errors);
}

// Валидация группы
const groupValidation = integration.validateGroupData(groupData);
```

### Управление сервисами

```javascript
// CRUD операции
await integration.createService(serviceData);
await integration.updateService('service-id', updateData);
await integration.deleteService('service-id');
```

### Система событий

```javascript
// Подписка на события
integration.on('service:created', handleCreated);
integration.on('service:updated', handleUpdated);
integration.on('service:deleted', handleDeleted);
integration.on('config:reloaded', handleConfigReload);

// Отписка
integration.off('service:created', handleCreated);
```

## 📋 CLI команды

| Команда | Описание | Пример |
|---------|----------|---------|
| `list` | Список всех сервисов и групп | `service-cli.bat list` |
| `start <id>` | Запуск сервиса | `service-cli.bat start projects-manager-ui` |
| `stop <id>` | Остановка сервиса | `service-cli.bat stop projects-manager-ui` |
| `restart <id>` | Перезапуск сервиса | `service-cli.bat restart projects-manager-ui` |
| `status [id]` | Статус сервисов | `service-cli.bat status projects-manager-ui` |
| `autostart [group]` | Автозапуск сервисов | `service-cli.bat autostart development` |
| `config` | Показать конфигурацию | `service-cli.bat config` |
| `edit` | Открыть конфигурацию | `service-cli.bat edit` |
| `help` | Справка | `service-cli.bat help` |

## 🏷️ Группы сервисов

- **development** - Сервисы среды разработки
- **production** - Продакшн сервисы  
- **automation** - Инструменты автоматизации
- **testing** - Тестовые сервисы
- **ai** - AI сервисы
- **tools** - Инструменты разработки

## ⚙️ Конфигурация

Конфигурация сервисов хранится в `config/services.json`:

```json
{
  "version": "1.0.0",
  "services": {
    "service-id": {
      "name": "Service Name",
      "enabled": true,
      "group": "development",
      "autostart": true,
      "startCommands": [
        {
          "id": "dev",
          "command": "npm",
          "args": ["run", "dev"],
          "cwd": "./service-directory",
          "port": 3000
        }
      ]
    }
  },
  "groups": {
    "development": {
      "name": "Development Environment",
      "autoStart": true,
      "enabled": true
    }
  }
}
```

## 🔧 Настройка путей

Для корректной работы CLI убедитесь, что:

1. **Node.js** установлен и доступен в PATH
2. **Пути к сервисам** в конфигурации корректны
3. **Права доступа** позволяют запускать процессы

## 🚨 Устранение неполадок

### Ошибка "Node.js не найден"
```bash
# Установите Node.js с официального сайта
# https://nodejs.org/
```

### Ошибка "Permission denied"
```bash
# Запустите PowerShell от имени администратора
# или проверьте права доступа к директориям
```

### Сервис не запускается
```bash
# Проверьте конфигурацию сервиса
service-cli.bat config

# Проверьте статус
service-cli.bat status <service-id>

# Проверьте логи в директории logs/
```

## 📝 Примеры использования

### CLI команды

#### Запуск UI сервиса
```bash
# Запуск
service-cli.bat start projects-manager-ui

# Проверка статуса
service-cli.bat status projects-manager-ui

# Остановка
service-cli.bat stop projects-manager-ui
```

#### Управление группой development
```bash
# Автозапуск всех сервисов группы
service-cli.bat autostart development

# Список сервисов группы
service-cli.bat list
```

#### Редактирование конфигурации
```bash
# Открыть в редакторе
service-cli.bat edit

# Просмотреть текущую конфигурацию
service-cli.bat config
```

### Интеграция с UI фреймворками

#### React
```javascript
import React, { useState, useEffect } from 'react';
import { ServiceManagementIntegration } from '@libs/system/service-management/integration';

const ServiceManager = () => {
    const [integration] = useState(() => new ServiceManagementIntegration());
    const [services, setServices] = useState([]);

    useEffect(() => {
        loadServices();
        integration.on('service:created', handleServiceCreated);
        return () => integration.off('service:created', handleServiceCreated);
    }, []);

    const loadServices = async () => {
        const data = await integration.getServicesData('flat');
        setServices(data);
    };

    const handleServiceCreated = (service) => {
        setServices(prev => [...prev, service]);
    };

    return (
        <div>
            {services.map(service => (
                <div key={service.id}>{service.name}</div>
            ))}
        </div>
    );
};
```

#### Vue
```javascript
<template>
  <div>
    <div v-for="service in services" :key="service.id">
      {{ service.name }}
    </div>
  </div>
</template>

<script>
import { ServiceManagementIntegration } from '@libs/system/service-management/integration';

export default {
  data() {
    return {
      integration: null,
      services: []
    };
  },
  async mounted() {
    this.integration = new ServiceManagementIntegration();
    await this.loadServices();
  },
  methods: {
    async loadServices() {
      this.services = await this.integration.getServicesData('flat');
    }
  }
};
</script>
```

#### HTML + JavaScript
```html
<!DOCTYPE html>
<html>
<head>
    <title>Service Manager</title>
</head>
<body>
    <div id="services"></div>
    
    <script type="module">
        import { ServiceManagementIntegration } from './integration.js';
        
        const integration = new ServiceManagementIntegration();
        
        async function loadServices() {
            const services = await integration.getServicesData('flat');
            const container = document.getElementById('services');
            container.innerHTML = services.map(s => 
                `<div>${s.name}</div>`
            ).join('');
        }
        
        loadServices();
    </script>
</body>
</html>
```

### Запуск примеров

```bash
# Запуск всех примеров
node examples.js

# Запуск конкретного примера
node -e "require('./examples').basicUsageExample()"
```

## 🤝 Вклад в разработку

Для добавления новых функций или исправления ошибок:

1. Создайте issue с описанием проблемы
2. Сделайте fork репозитория
3. Создайте feature branch
4. Внесите изменения
5. Создайте pull request

## 📄 Лицензия

MIT License
