# Сравнение вариантов развития системы

> **Дата**: 2026-03-28

## Важное уточнение

**После проверки кода обнаружено:** `server-promise.json` **активно используется** в системе:

- [`a2a-client/vite-plugin-a2a/storage/promise-status.js`](a2a-client/vite-plugin-a2a/storage/promise-status.js) — определения состояний polling
- [`a2a-client/vite-plugin-a2a/storage/newSessions.js:266`](a2a-client/vite-plugin-a2a/storage/newSessions.js:266) — save/load/remove server-promise.json
- [`a2a-client/vite-plugin-a2a/routes/step-routes-async-flow.js`](a2a-client/vite-plugin-a2a/routes/step-routes-async-flow.js) — polling daemon
- Тесты в [`a2a-client/tests/unit/vite-plugin-storage.test.js`](a2a-client/tests/unit/vite-plugin-storage.test.js) — проверяют round-trip

> Это **НЕ** устаревший файл, как предполагалось ранее.

---

## Все варианты

| # | Вариант | Сложность | Риск | Реализация |
|---|--------|-----------|------|-----------|
| 1 | Модульные цепочки | Высокая | 7/10 | [README](01-modular-chains/README.md) |
| 2 | Эволюционные улучшения | Низкая | 3/10 | [README](02-evolutionary-improvements/README.md) |
| 3 | Уточнение Promise | Очень низкая | 1/10 | [README](03-clarify-promise-system/README.md) |
| 4 | Трансмутация протокол | Средняя | 4/10 | [README](04-transmutation-protocol/README.md) |
| 5 | Базовые исправления | Минимальная | 1/10 | [README](05-basic-fix/README.md) |
| 6 | Гибридный | Средняя | 3/10 | [README](06-hybrid-combine/README.md) |

---

## Детальное сравнение

### Вариант 1: Модульные цепочки

**Суть**: Разделить схему на импортируемые части с триггерами

**Что берем**: Переиспользование шагов

**Артефакты**: `schemas/chains/`, `trigger-engine.js`

**Оценка**: 7/10 риска — слишком сложно

---

### Вариант 2: Эволюционные улучшения

**Суть**: Постепенные улучшения без радикальных переделок

**Что берем**: Sub-steps документация, терминология

**Артефакты**: GLOSSARY.md обновленный, SCHEMA.md substeps

**Оценка**: 3/10 риска

---

### Вариант 3: Уточнение Promise System

**Суть**: Документировать текущее поведение

**Что берем**: Разделение симуляций, понятные термины

**Артефакты**: simulations/sync/, simulations/async/

**Оценка**: 1/10 риска — самый безопасный

---

### Вариант 4: Трансмутация протокол (НОВЫЙ)

**Суть**: Тикет с историей операций + error states

**Что берем**: 
- `operationHistory[]`
- Error/stopped states
- Retry button

**Артефакты**: 
- server: operationHistory в request
- client: operation-history.json
- UI: retry button

**Оценка**: 4/10 риска

---

### Вариант 5: Базовые исправления

**Суть**: Минимум чтобы заработало

**Что берем**: 
- Обновить документацию
- + error статус

**Артефакты**: METHODOLOGY-AGENT-SCRIPT.md обновленный

**Оценка**: 1/10 риска — самый быстрый

---

### Вариант 6: Гибридный

**Суть**: Комбинировать лучшее из 2, 3, 4

**Что берем**:
- Разделение симуляций (3)
- Error states (4)
- Docs (2)
- History light (4)

**Артефакты**: Комбинированные

**Оценка**: 3/10 риска

---

## Моя рекомендация (выбор)

### Выбираю: **Вариант 6 (Гибридный)**

### Почему:

1. **Берет лучшее из всех** — не изобретаем заново
2. **Постепенно** — можно делать по фазам
3. **Практично** — дает конкретные error states (то что нужно)
4. **Низкий риск** — 3/10
5. **Реально** — можно начать сразу

### Почему не другие:

| Вариант | Почему нет |
|--------|-----------|
| 1 (Модульные) | Слишком сложно, нужно много ресурсов |
| 2 (Эволюция) | Не дает конкретную функциональность |
| 3 (Уточнение) | Только документация, мало изменений |
| 4 (Трансмутация) | Хорошо, но много new code сразу |
| 5 (Базовые) | Слишком минимально, не решает проблему |

### Порядок реализации (для варианта 6):

| Фаза | Задача | Недели |
|------|--------|--------|
| 1 | Разделить симуляции | 1 |
| 2 | Error states | 1 |
| 3 | Docs | 1 |
| 4 | History light | 2 |

**Итого: ~5 недель**

---

## Документы

- [01-modular-chains/README.md](./01-modular-chains/README.md) — Вариант 1
- [02-evolutionary-improvements/README.md](./02-evolutionary-improvements/README.md) — Вариант 2
- [03-clarify-promise-system/README.md](./03-clarify-promise-system/README.md) — Вариант 3
- [04-transmutation-protocol/README.md](./04-transmutation-protocol/README.md) — Вариант 4
- [05-basic-fix/README.md](./05-basic-fix/README.md) — Вариант 5
- [06-hybrid-combine/README.md](./06-hybrid-combine/README.md) — Вариант 6

## Связанные документы

- [../METHODOLOGY-AGENT-SCRIPT.md](../METHODOLOGY-AGENT-SCRIPT.md) — Текущая методология
- [../DEV_STATE.md](../DEV_STATE.md) — Состояние системы