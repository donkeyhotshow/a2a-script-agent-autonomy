# Схема базы данных A2A Server

> **Относится к:** a2a-server

## Обзор

Документ описывает схему базы данных PostgreSQL с использованием Prisma ORM.

## Модели

### Client

Клиент (пользователь или сервис).

```prisma
model Client {
  id            String    @id @default(uuid())
  name          String
  apiKey        String    @unique
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  projects      Project[]
}
```

- [ ] [Модель Client](#модель-client)
- [ ] [Индекс на apiKey](#индекс-на-apikey)

### Project

Проект, принадлежащий клиенту.

```prisma
model Project {
  id            String    @id @default(uuid())
  clientId      String
  name          String
  description   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  client        Client    @relation(fields: [clientId], references: [id])
  sessions      Session[]
}
```

- [ ] [Модель Project](#модель-project)
- [ ] [Индекс на clientId](#индекс-на-clientid)

### Session

Сессия для взаимодействия.

```prisma
model Session {
  id            String    @id @default(uuid())
  projectId     String
  status        SessionStatus @default(ACTIVE)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  project       Project   @relation(fields: [projectId], references: [id])
  messages      Message[]
  requests      Request[]
}

enum SessionStatus {
  ACTIVE
  COMPLETED
  ARCHIVED
}
```

- [ ] [Модель Session](#модель-session)
- [ ] [Индекс на projectId](#индекс-на-projectid)
- [ ] [Enum SessionStatus](#enum-sessionstatus)

### Message

Сообщение в сессии.

```prisma
model Message {
  id            String    @id @default(uuid())
  sessionId     String
  role          MessageRole
  content       Json
  direction     Direction @default(TO_SERVER)
  createdAt     DateTime  @default(now())
  
  session       Session   @relation(fields: [sessionId], references: [id])
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum Direction {
  TO_SERVER
  TO_CLIENT
}
```

- [ ] [Модель Message](#модель-message)
- [ ] [Индекс на sessionId](#индекс-на-sessionid)
- [ ] [Индекс на promiseId](#индекс-на-promiseid)
- [ ] [Enum MessageRole](#enum-messagerole)
- [ ] [Enum Direction](#enum-direction)

### Request

Запрос к серверу.

```prisma
model Request {
  id            String    @id @default(uuid())
  promiseId     String    @unique
  sessionId    String?
  task          String
  context       Json?
  status        RequestStatus @default(PENDING)
  result        Json?
  error         Json?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  session       Session?  @relation(fields: [sessionId], references: [id])
}

enum RequestStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}
```

- [ ] [Модель Request](#модель-request)
- [ ] [Уникальный индекс на promiseId](#уникальный-индекс-на-promiseid)
- [ ] [Индекс на sessionId](#индекс-на-sessionid-1)
- [ ] [Индекс на status](#индекс-на-status)
- [ ] [Enum RequestStatus](#enum-requeststatus)

## Индексы

- [ ] [Индексы для часто используемых запросов](#индексы-для-часто-используемых-запросов)
- [ ] [Составные индексы для фильтрации](#составные-индексы-для-фильтрации)

## Миграции

- [ ] [Накат миграций при деплое](#накат-миграций-при-деплое)
- [ ] [Rollback стратегия](#rollback-стратегия)

## Seed данные

- [ ] [Тестовые данные для разработки](#тестовые-данные-для-разработки)

---

### Модель Client


### Индекс на apiKey


### Модель Project


### Индекс на clientId


### Модель Session


### Индекс на projectId


### Enum SessionStatus


### Модель Message


### Индекс на sessionId


### Индекс на promiseId


### Enum MessageRole


### Enum Direction


### Модель Request


### Уникальный индекс на promiseId


### Индекс на sessionId


### Индекс на status


### Enum RequestStatus


### Индексы для часто используемых запросов


### Составные индексы для фильтрации


### Накат миграций при деплое


### Rollback стратегия


### Тестовые данные для разработки
