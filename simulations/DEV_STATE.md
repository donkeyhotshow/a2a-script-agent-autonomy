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

Канонический pipeline содержит до 8 файлов (в зависимости от шага):
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
- Есть warning debt в `sim:validate` (optional files not found), несмотря на общий статус `valid`
- Требуется регулярная чистка: неактуальные исключения по file-set должны удаляться после нормализации сценариев

---

## Задачи (Next Tasks)

- [ ] Развести в документе два уровня качества: `valid` и `clean` (без warning) для `sim:validate`.
- [ ] Пройтись по сценариям с массовыми warning и зафиксировать по каждому: добавляем missing transform-файлы или документируем исключение.
- [ ] Добавить недостающие roadmap-сценарии из `simulations/SCHEMA.md`: paginated `rag-search`, очередь `read-file`, human-gate после N шагов.
- [ ] Проверить и обновить ссылки/описания, чтобы `simulations/DEV_STATE.md` не конфликтовал с `simulations/SCHEMA.md`.
- [ ] Для сценариев без markdown-этапов (без LLM) явно маркировать expected file set, чтобы отсутствие `request.md/response.md` не воспринималось как дефект.

---

## Ссылки

- [Спецификация протокола](../docs/new-request-flow/PROTOCOL.md)
- [SCHEMA.md](../docs/new-request-flow/SCHEMAS.md)
- [SERVER-CONTRACT.md](./SERVER-CONTRACT.md) - контракт и поведение системы

---

*Обновлено: 2026-03-27*