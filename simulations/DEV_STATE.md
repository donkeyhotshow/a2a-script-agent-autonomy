# DEV_STATE - simulations (2026-03-27)

Текущее состояние симуляций (golden fixtures).

---

## Критические изменения

Симуляции обновлены для поддержки нового формата протокола:
- Action-key shape для execute/result
- Context fields: execution, history, workbench
- Step-based session storage
- Server transforms (request/response)

---

## Структура симуляций

Каждая симуляция содержит обязательные файлы:
- `request.json` - входные данные (schema invoke)
- `request.md` - читаемая версия запроса
- `response.json` - ответ сервера (action-key shape)
- `response.md` - читаемая версия ответа
- `server-transforms-request.json` - трансформация запроса
- `server-transforms-response.json` - трансформация ответа
- `received.json` - Web execute DTO (form/message/attachments)

Дополнительно:
- `interrupt.md` - документация по прерываниям (gray room)
- `N-sub-M/` - шаги прерывания (server-only)

---

## Формат (обязательный)

Action-key shape в execute и result:

```json
// ✅ Правильно:
{ "execute": { "script": { ... } } }
{ "result": { "read-file": { "path": "...", "content": "..." } } }

// ❌ Неправильно:
{ "execute": { "action": "read-file", "file": "..." } }
{ "result": { "content": "..." } }
```

---

## Валидация

```bash
# Лint всех симуляций
npm run sim:lint -- --all --json

# Валидация конкретной симуляции
npm run sim:validate -- --sim <name> --json
```

---

## Статус

- Последнее обновление: 2026-03-27
- Активные сценарии: 89 корней шагов/сценариев
- Использование: golden standard + sim:lint/sim:validate

---

## Ссылки

- [Спецификация протокола](../docs/new-request-flow/PROTOCOL.md)
- [SCHEMA.md](../docs/new-request-flow/SCHEMAS.md)
- [SERVER-CONTRACT.md](./SERVER-CONTRACT.md) - контракт и поведение системы

---

*Обновлено: 2026-03-27*