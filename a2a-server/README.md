# A2A Server

Agent-to-Agent сервер для интеллектуального анализа кодовой базы.

## Технологический стек

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **Framework:** Express
- **Database:** PostgreSQL + pgvector
- **Cache/Queue:** Redis + BullMQ
- **ML:** Plexe
- **Git:** simple-git

## Быстрый старт

### Предварительные требования

- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 16 с расширением pgvector (или через Docker)

### Установка

```bash
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

```bash
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
│   ├── ml/                   # ML интеграции
│   ├── protocol/             # Протокол A2A
│   ├── queue/                # Очереди задач
│   └── websocket/            # WebSocket handlers
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

### Projects
- `GET /api/v1/projects` - Список проектов
- `POST /api/v1/projects` - Создать проект
- `GET /api/v1/projects/:id` - Получить проект
- `DELETE /api/v1/projects/:id` - Удалить проект
- `GET /api/v1/projects/:id/indexing-status` - Статус индексации
- `GET /api/v1/projects/:id/architecture` - Архитектурные особенности
- `POST /api/v1/projects/:id/search` - Поиск по коду
- `POST /api/v1/projects/:id/webhook` - Git webhook

### Sessions
- `POST /api/v1/sessions` - Создать сессию
- `GET /api/v1/sessions/:id` - Статус сессии
- `POST /api/v1/sessions/:id/message` - Отправить сообщение (new_task)
- `POST /api/v1/sessions/:id/files` - Отправить файлы
- `POST /api/v1/sessions/:id/continue` - Продолжить (кнопка "Делаем")
- `POST /api/v1/sessions/:id/confirm` - Подтвердить изменения
- `DELETE /api/v1/sessions/:id` - Удалить сессию

## Скрипты

```bash
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

- [Требования к серверу](../plans/a2a-server-requirements-analysis.md)
- [API спецификация](../plans/a2a-server-api-specification.md)
- [Схема БД](../plans/a2a-server-database-schema.md)
- [План реализации](../plans/a2a-server-implementation-plan.md)

## Лицензия

MIT
