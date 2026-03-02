# A2A Server

Agent-to-Agent сервер для интеллектуального анализа кодовой базы.

## Технологический стек

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express
- **Database:** PostgreSQL + pgvector
- **Cache/Queue:** Redis + BullMQ
- **ML:** Plexe Local CPU Solutions
- **Git:** simple-git

## Быстрый старт

### Предварительные требования

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 с расширением pgvector (или через Docker)

### Установка

```
bash
# Клонировать репозиторий
cd a2a-server

# Установить зависимости
npm install

# Скопировать .env.example в .env и настроить
cp .env.example .env

# Запустить PostgreSQL и Redis через Docker
npm run docker:up

# Сгенерировать Prisma клиент
npm run prisma:generate

# Применить миграции
npm run prisma:migrate

# Запустить в режиме разработки
npm run dev
```

### Проверка

```
bash
# Health check
curl http://localhost:3000/health

# Detailed health check
curl http://localhost:3000/health/detailed
```

## Структура проекта

```
a2a-server/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app setup
│   ├── config/               # Конфигурация
│   ├── routes/               # API маршруты
│   ├── controllers/          # Контроллеры
│   ├── services/             # Бизнес-логика
│   ├── repositories/         # Доступ к данным
│   ├── middleware/           # Express middleware
│   ├── types/                # TypeScript типы
│   ├── utils/                # Утилиты
│   ├── protocol/             # Протокол A2A
│   └── queue/                # Очереди задач
├── prisma/
│   └── schema.prisma         # Схема БД
├── tests/                    # Тесты
├── docker-compose.yml        # Docker Compose
├── Dockerfile                # Docker image
└── package.json
```

## API Endpoints

### Auth

- `POST /api/v1/auth/register` - Регистрация клиента
- `POST /api/v1/auth/token` - Получение JWT токена
- `POST /api/v1/auth/refresh` - Обновление токена
- `GET /api/v1/auth/me` - Текущий пользователь

### Requests (Async Protocol)

- `POST /api/v1/requests` - Создать запрос, возвращает `promiseId`
- `GET /api/v1/requests/:promiseId/status` - Статус запроса
- `GET /api/v1/requests/:promiseId/result` - Результат (completed/failed)
- `DELETE /api/v1/requests/:promiseId` - Отменить запрос
- `DELETE /api/v1/requests/queue/pending` - Очистить очередь
- `GET /api/v1/requests/queue/stats` - Статистика очереди

### Sessions

- `POST /api/v1/sessions` - Создать сессию
- `GET /api/v1/sessions` - Список сессий (требует projectId)
- `GET /api/v1/sessions/:sessionId` - Получить сессию
- `PATCH /api/v1/sessions/:sessionId` - Обновить сессию
- `DELETE /api/v1/sessions/:sessionId` - Удалить сессию
- `GET /api/v1/sessions/:sessionId/messages` - Сообщения сессии
- `POST /api/v1/sessions/:sessionId/messages` - Добавить сообщение

### Legacy Endpoints

- `POST /api/v1/invoke` - Создать запрос (legacy)
- `POST /api/v1/message` - Альтернативное имя для invoke
- `GET /api/v1/health` - Health check

## Скрипты

```
bash
npm run dev          # Запуск в режиме разработки
npm run build        # Сборка TypeScript
npm run start        # Запуск production сборки
npm run test         # Запуск тестов
npm run lint         # Проверка ESLint
npm run format       # Форматирование Prettier
npm run prisma:studio # Prisma Studio UI
```

## Переменные окружения

См. `.env.example` для полного списка конфигурационных параметров.

## Документация

- [План реализации](../docs/archive/a2a-server-implementation-plan.md)

## Лицензия

MIT
