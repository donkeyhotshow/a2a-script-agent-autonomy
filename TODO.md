# A2A Coding Orchestrator — Асинхронный протокол

## Текущая задача

Реализация асинхронного протокола обмена данными между клиентом и сервером.

### Принципы

1. **Сервер минималистичный** — только приём запросов, очередь, возврат promiseId
2. **Сервер не хранит сессии** — не знает про Session, Message, Project
3. **Клиент хранит всё** — сессии в .a2a/sessions/, текущий проект в cookie
4. **Polling на клиенте** — каждые 5 секунд

---

## План

### Фаза 1: Сервер — База данных
- [ ] Добавить модель Request в Prisma schema
- [ ] Создать миграцию

### Фаза 2: Сервер — API
- [ ] Создать requests.routes.ts с 4 endpoint'ами
- [ ] Обновить routes/index.ts

### Фаза 3: Очистка сервера
- [ ] Удалить SessionService
- [ ] Удалить MessageService
- [ ] Удалить sessions.routes.ts
- [ ] Удалить websocket код

### Фаза 4: Клиент
- [ ] Обновить sessions.js — работа с .a2a папкой
- [ ] Создать api.js — функции для API сервера
- [ ] Обновить storage.js — работа с .a2a/sessions/
- [ ] Добавить spinner стили

### Фаза 5: Тестирование
- [ ] Протестировать полный цикл

---

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /api/v1/requests | Создать запрос → promiseId |
| GET | /api/v1/requests/:promiseId/status | Получить статус |
| GET | /api/v1/requests/:promiseId/result | Получить результат |
| DELETE | /api/v1/requests/:promiseId | Отменить запрос |

---

## Статусы запроса

| Статус | Описание |
|--------|----------|
| pending | В очереди |
| processing | Обрабатывается |
| completed | Готов |
| failed | Ошибка |
| cancelled | Отменён |

---

## Документация

- [Детальный план](plans/async-protocol-change.md)
- [TODO сервера](a2a-server/TODO.md)
- [TODO клиента](a2a-client/TODO.md)
