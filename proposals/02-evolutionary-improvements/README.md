# Вариант 2: Эволюционные улучшения

> **Статус**: Предложение
> **Дата**: 2026-03-28
> **Автор**: System Architect

## Концепция

Продолжать развивать существующую систему, добавляя улучшения постепенно, без радикальных изменений архитектуры.

## Текущие проблемы (из DEV_STATE)

1. **Gray Room (серая комната)** - требует переосмысления
2. **Promise System** - сложная для понимания
3. **Sub-steps (подшаги)** - не задокументированы

## Предлагаемые улучшения

### 1. Уточнить Gray Room

**Текущее определение**: "Server-side interrupt loop" (серверный цикл прерываний)

**Проблема**: Термин "серая комната" не отражает суть - это не комната, а состояние processing.

**Решение**: Переименовать в более понятный термин:
- `processing-loop` - цикл обработки
- `async-chain` - асинхронная цепочка
- `sub-step-flow` - поток подшагов

### 2. Упростить Promise System

Текущая сложность:
- `promiseId` - ID промиса
- `asyncPending` - флаг ожидания
- `server-promise.json` - файл состояния

**Упрощение**:
- Убрать `promiseId` в пользу `step-based` подхода
- Хранить состояние в `context.workbench.slots.pendingStep`
- Убрать файлы `server-promise.json`

### 3. Добавить документацию для sub-steps

```markdown
## Sub-steps (Подшаги)

Sub-step - это дополнительный шаг внутри основного шага сессии.

### Когда используются:
- Агент выполняет несколько операций подряд
- Нужен промежуточный результат
- Операция требует подтверждения

### Формат:
{
  "step": 3,
  "substep": 1,
  "execute": { ... },
  "context": { ... }
}
```

### 4. Разделить симуляции

**Текущее**: Одна симуляция `simulations/agent` включает всё

**Предложение**:
```
simulations/
├── agent/              # Базовый агент
├── agent-promise/      # Агент с промисами (НЕ РАССМАТРИВАЕТСЯ)
├── agent-substep/     # Агент с подшагами (НЕ РАССМАТРИВАЕТСЯ)
└── agent-mock/        # Макет для быстрых тестов
```

**理由** (Обоснование): 
- Симуляции становятся проще
- легче поддерживать
- меньше "hidden complexity"

## Плюсы

1. **Обратная совместимость**: Не ломаем существующий код
2. **Постепенность**: Можно внедрять по частям
3. **Меньше рисков**: Изменения контролируемые
4. **Проще симуляции**: Разделение уменьшает сложность

## Минусы

1. **Технический долг**: Накапливается
2. **Сложность**: Система остаётся сложной
3. **Документация**: Нужно поддерживать в актуальном состоянии

## Как реализовать

### Этап 1: Терминология

**Файл:** [`GLOSSARY.md`](../GLOSSARY.md)

```markdown
### Gray Room

**СТАРОЕ**: Server-side interrupt loop
**НОВОЕ**: Async processing loop / Sub-step flow

- Убрать "серая комната" из кода
- Использовать: `processing-loop`, `async-chain`
```

**Изменения:**
- [`gray-room-orchestrator.ts`](a2a-server/src/services/core/request-processor/gray-room-orchestrator.ts): переименовать класс
- [`AGENTS.md`](../AGENTS.md): обновить термины

### Этап 2: Sub-steps документация

**Файл:** [`simulations/SCHEMA.md`](../simulations/SCHEMA.md)


```json
// Новое поле в execute
{
  "execute": {
    "script": {...},
    "substep": 1
  }
}
```

**Артефакты:**
- `context.execution.currentSubstep`
- `context.execution.totalSubsteps`

### Этап 3: Разделение симуляций

```
a2a-server/simulations/
├── agent/
│   ├── request.json
│   └── response.json
├── agent-promise/      # НЕ ИСПОЛЬЗОВАТЬ
└── agent-substep/     # НЕ ИСПОЛЬЗОВАТЬ
```

### Этап 4: Упрощение Promise

**Файл:** [`a2a-client/vite-plugin-a2a/storage/promise-status.js`](a2a-client/vite-plugin-a2a/storage/promise-status.js)

```javascript
// Вместо server-promise.json:
const pendingState = {
  step: context.workbench.slots.pendingStep,
  data: {...}
};
```

## Roadmap

| Этап | Задача | Файлы | Статус |
|------|--------|-------|--------|
| 1 | Терминология | GLOSSARY.md, AGENTS.md | TODO |
| 2 | Sub-steps docs | SCHEMA.md | TODO |
| 3 | Разделить симуляции | simulations/ | TODO |
| 4 | Promise упрощение | promise-status.js | TODO |

## Связанные документы

- [](../AGENTS.md) - текущие правила
- [](../simulations/SCHEMA.md) - контракт симуляций
- [](./01-modular-chains/README.md) - альтернативный вариант