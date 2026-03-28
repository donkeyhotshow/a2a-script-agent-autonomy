# Вариант 6: Гибридный подход

> **Статус**: Предложение
> **Дата**: 2026-03-28
> **Автор**: System Architect

## Концепция

Взять лучшее из вариантов 2, 3 и 4:
- Разделение симуляций (вариант 3)
- Документация (вариант 2)  
- Error states + transmutation (вариант 4)

Без радикальных изменений архитектуры (не как вариант 1).

## Что берем из каждого варианта

| Вариант | Берем | Не берем |
|--------|-------|---------|
| 01 Модульные | — | Всё (сложно) |
| 02 Эволюция | Sub-steps docs | Полная переработка |
| 03 Уточнение | Разделение симуляций | — |
| 04 Трансмутация | Error states, retry | Полную переделку Promise |

## Реализация

### Фаза 1: Разделение симуляций (из варианта 3)

```
simulations/
├── basic/           # Только dialog, form, script
├── async/           # Promise flow
└── experimental/   # transmutation (НЕ ТРОГАТЬ пока)
```

### Фаза 2: Error states (из варианта 4)

```javascript
// newSessions.js
const SESSION_STATUSES = ['active', 'completed', 'corrupt', 'error', 'stopped'];
```

- Добавить `'error'` и `'stopped'` статусы
- Кнопка Retry (UI)
- Модальное окно с деталями

### Фаза 3: Documentation (из варианта 2)

- Обновить GLOSSARY
- Убрать "Gray Room"
- Document sub-steps

### Фаза 4: Transmutation light (из варианта 4)

Только:
- `operationHistory[]` — записывать операции
- Без полной переделки Promise

```json
{
  "operationHistory": [
    {"step": 1, "operation": "llm-call", "result": "success"}
  ]
}
```

## Артефакты

| Компонент | Файл | Изменение |
|----------|------|----------|
| Симуляции | simulations/ | Разделить |
| Statuses | newSessions.js | + error, stopped |
| History | server-response.json | + operationHistory |
| Docs | GLOSSARY.md | Обновить |

## Roadmap

| Фаза | Задача | Вариант-источник | Статус |
|------|--------|------------------|--------|
| 1 | Симуляции | 03 | TODO |
| 2 | Error states | 04 | TODO |
| 3 | Docs | 02 | TODO |
| 4 | History light | 04 | TODO |

## Плюсы

1. **Постепенно** — можно делать по частям
2. **Комбинирует лучшее** — не изобретаем велосипед
3. **Низкий риск** — минимум нового кода

## Минусы

1. **Не целостное решение** — может быть несогласованно
2. **Много источников** — сложнее поддерживать