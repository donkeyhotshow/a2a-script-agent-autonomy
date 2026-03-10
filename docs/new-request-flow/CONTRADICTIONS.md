# Противоречия между документами

## Выявленные и ИСПРАВЛЕННЫЕ противоречия

### 1. Кто генерирует UI команды

#### ПРАВИЛЬНО (из STAGES/simulations/PROMISE-WAITING.md и UI-COMMANDS.md):

> **Важно:** `execute.ui` генерируется на стороне **Client API**, а не на A2A Server.

```
Server → promiseId → Client API → execute.ui → Web UI
```

#### БЫЛО ПРОТИВОРЕЧИЕ (в PROTOCOLS/states/pending.md и waiting.md):

В документах PROTOCOLS/states я написал что **Server** напрямую возвращает UI команды.

#### ИСПРАВЛЕНО:

- [x] Исправлен PROTOCOLS/states/pending.md
- [x] Исправлен PROTOCOLS/states/waiting.md

Теперь документация правильно указывает:
1. Server возвращает только form или promiseId
2. Client API добавляет UI команды
3. Client API → Web UI содержит объединенный ответ

---

### 2. Формат Promise Polling

#### ПРАВИЛЬНО (симуляции):

```
GET /api/promises/:id
```

#### БЫЛО (PROTOCOLS/states/pending.md):

```javascript
// В документах была опечатка
romises/:idGET /api/p
```

#### ИСПРАВЛЕНО:

- [x] Исправлена опечатка в пути

---

### 3. States диаграмма

#### В STAGES/simulations/PROMISE-WAITING.md:
- "Client API (a2a-client/packages/sdk) должен указывать что показывать"
- "Server возвращает promiseId, Client API формирует UI команды"

#### БЫЛО ПРОТИВОРЕЧИЕ (в PROTOCOLS/states/waiting.md):
- Написано что Server напрямую шлет execute.ui

#### ИСПРАВЛЕНО:

- [x] waiting.md теперь показывает правильный поток: Server → Client API → Web UI

---

## Статус: ВСЕ ПРОТИВОРЕЧИЯ ИСПРАВЛЕНЫ ✅

### Что было сделано:

1. **pending.md** - добавлено описание роли Client API в формировании UI команд
2. **waiting.md** - исправлены примеры: Server → Client API → Web UI
3. **CONTRADICTIONS.md** - обновлен статус противоречий

### Правильная архитектура:

```
A2A Server                    Client API (a2a-client)           Web UI
     │                              │                              │
     │← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ →│                              │
     │   POST /api/sessions         │                              │
     │                              │                              │
     │← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ →│                              │
     │   AI Hub processing...       │                              │
     │                              │                              │
     │── promiseId + status ───────→│                              │
     │   (без UI команд)            │                              │
     │                              │←─ execute.ui (добавлено) ──→│
     │                              │                              │
     │← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ →│                              │
     │   GET /api/promises/:id     │                              │
     │                              │                              │
     │── promise result ──────────→│                              │
     │                              │←─ execute + ui ────────────→│
```

Client API (a2a-client/packages/sdk) выступает как "middleware" который:
1. Получает promiseId от Server
2. Сам формирует UI команды на основе promiseId
3. Отправляет объединенный ответ в Web UI
