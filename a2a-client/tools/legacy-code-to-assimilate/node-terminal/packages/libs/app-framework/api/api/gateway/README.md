# Gateway Library

Библиотека для создания API шлюзов и прокси-серверов, извлеченная из приложения `main-gateway`.

## 🎯 Возможности

- **Создание Express приложений**: фабричная функция для создания приложений
- **Обработка запросов**: централизованная обработка HTTP запросов
- **Управление маршрутами**: динамическое управление маршрутами
- **Middleware система**: гибкая система промежуточного ПО
- **Валидация API**: проверка входящих запросов
- **Аутентификация**: поддержка JWT и Basic Auth

## 📦 Установка

```bash
npm install @libs/gateway
```

## 🚀 Использование

### Базовое использование

```javascript
import { createGatewayApp } from '@libs/gateway';

// Создание приложения
const { app, services, authPolicies } = createGatewayApp();

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Gateway running on port ${PORT}`);
});
```

### Создание с зависимостями

```javascript
import { createGatewayApp } from '@libs/gateway';

// Создание с мок-зависимостями для тестирования
const { app } = createGatewayApp({
  fs: mockFs,
  path: mockPath,
  fetch: mockFetch,
  jwt: mockJwt
});
```

### Управление маршрутами

```javascript
import { RouteManager } from '@libs/gateway';

const routeManager = new RouteManager();

// Добавление маршрута
routeManager.addRoute('/api/users', {
  target: 'http://localhost:3001',
  auth: 'required'
});

// Удаление маршрута
routeManager.removeRoute('/api/users');
```

### Middleware система

```javascript
import { MiddlewareCore } from '@libs/gateway';

const middleware = new MiddlewareCore();

// Добавление middleware
middleware.use('auth', (req, res, next) => {
  // Проверка аутентификации
  if (req.headers.authorization) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Применение middleware к маршруту
middleware.applyToRoute('/api/protected', ['auth']);
```

## 🏗️ Архитектура

```
src/
├── gateway-app.js         # Фабричная функция приложения
├── request-handler.js     # Обработчик запросов
├── route-manager.js       # Управление маршрутами
├── middleware-core.js     # Ядро middleware системы
├── api-validator.js       # Валидация API
└── auth-manager.js        # Управление аутентификацией
```

## 🔧 Зависимости

- `express` - веб-фреймворк
- `http-proxy-middleware` - прокси middleware
- `jsonwebtoken` - JWT токены
- `bcryptjs` - хеширование паролей

## 🧪 Тестирование

```bash
npm test
```

## 📚 Документация

Подробная документация по каждому классу и методу доступна в исходном коде.

## 🔄 Миграция

Для миграции с `main-gateway`:

1. Замените импорты:
   ```javascript
   // Было
   import { createGatewayApp } from './server.js';
   
   // Стало
   import { createGatewayApp } from '@libs/gateway';
   ```

2. Обновите вызовы методов согласно новому API

3. Обновите зависимости в `package.json`

## 📝 Лицензия

MIT
