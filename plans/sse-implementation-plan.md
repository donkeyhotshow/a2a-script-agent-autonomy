# SSE Implementation Plan

## Выбор: Server-Sent Events (SSE)

### Почему SSE:
- ✅ Проще в реализации чем WebSockets
- ✅ Работает через обычный HTTP
- ✅ Автоматическое переподключение
- ✅ Идеально для: логов, прогресса, уведомлений
- ✅ Один запрос от клиента - много событий от сервера

### Architecture

```
Клиент (браузер)  <--HTTP-->  Сервер (Express)
      |                        |
      +--- EventSource ----->  |
      (открыт постоянно)       |
      <---- events -----------+
      (логи, прогресс, статусы)
```

## Plan

### 1. Server: Add SSE endpoint
- New route: `GET /api/v1/events`
- Support for session-specific streams
- Event types: `log`, `progress`, `status`, `complete`, `error`

### 2. Client: EventSource implementation
- Replace polling with EventSource
- Handle events: onmessage, onerror, onopen
- Auto-reconnection

### 3. Use Cases
- Real-time action logs
- Progress updates
- Session status changes

## Implementation Steps

### Step 1: Server - SSE Route
File: `a2a-server/src/routes/sse.routes.ts`
- Create new route
- Implement EventEmitter for broadcasting
- Support multiple subscribers

### Step 2: Client - EventSource
File: `a2a-client/web/js/sse.js`
- Create SSE manager class
- Connect to server
- Handle incoming events
- Update UI in real-time

### Step 3: Integration
- Replace polling in sessions.js with SSE
- Add log viewer component
- Show progress in real-time

## Ready to implement?
