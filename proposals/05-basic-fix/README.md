# Вариант 5: Базовые исправления

> **Статус**: Предложение
> **Дата**: 2026-03-28
> **Автор**: System Architect

## Концепция

Минимальные изменения чтобы заработала базовая методология из `METHODOLOGY-AGENT-SCRIPT.md`. Без новых фич - только починить текущее.

## Что работает сейчас

| Функция | Статус |
|---------|--------|
| Dialog flow | ✓ Работает |
| Form flow | ✓ Работает |
| Script execution | ✓ Работает |
| Async/Promise | ✓ Работает |

## Что не работает

1. **Gray Room** — непонятно что делает
2. **Error handling** — нет retry, состояний ошибок
3. **Documentation** — не соответствует коду

## Реализация

### Этап 1: Исправить документацию

**Файл:** [`METHODOLOGY-AGENT-SCRIPT.md`](../METHODOLOGY-AGENT-SCRIPT.md)

Обновить чтобы соответствовало коду:
- Убрать обещания про Gray Room
- Document what's actually implemented

### Этап 2: Добавить error states

Минимально:
- [`a2a-client/vite-plugin-a2a/storage/newSessions.js`](a2a-client/vite-plugin-a2a/storage/newSessions.js): добавить `'error'` статус

```javascript
const SESSION_STATUSES = ['active', 'completed', 'corrupt', 'error'];
```

### Этап 3: Обновить GLOSSARY

Убрать непонятные термины:
- "Gray Room" → "post-processing"
- "Interrupt loop" → "retry logic"

## Артефакты

| Что | Файл | Изменение |
|-----|------|-----------|
| Error state | newSessions.js | + 'error' |
| Docs | METHODOLOGY-AGENT-SCRIPT.md | Обновить |

## Roadmap

| Этап | Задача | Файлы | Статус |
|------|--------|-------|--------|
| 1 | Documentation | METHODOLOGY-AGENT-SCRIPT.md | TODO |
| 2 | Error states | newSessions.js | TODO |
| 3 | GLOSSARY | GLOSSARY.md | TODO |

## Плюсы

1. **Минимум изменений** — меньше рисков
2. **Быстро** — можно сделать за день
3. **Совместимо** — ничего не ломаем

## Минусы

1. **Не новая функциональность** — только документация
2. **Техдолг** — остается