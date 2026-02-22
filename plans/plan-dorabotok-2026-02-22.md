# A2A Coding Orchestrator - Plan Dorabotok

**Data:** 2026-02-22  
**Status:** Updated - архитектурные изменения  

---

## Важное архитектурное изменение

**Сервер НЕ хранит данные клиента!**

Граф знаний:
- ❌ НЕ хранится в PostgreSQL
- ✅ Передаётся в контексте запроса
- ✅ Возвращается в ответе
- ✅ Хранится на клиенте

См. [docs/architecture-principles.md](../docs/architecture-principles.md)

---

## Что сделано

### Созданные файлы:

| Файл | Назначение |
|------|------------|
| [`a2a-server/src/types/entity.types.ts`](../a2a-server/src/types/entity.types.ts) | Типы сущностей и отношений |
| [`a2a-server/src/services/entity-recognizer.service.ts`](../a2a-server/src/services/entity-recognizer.service.ts) | Распознавание сущностей из кода |
| [`a2a-server/src/services/graph-store.service.ts`](../a2a-server/src/services/graph-store.service.ts) | Управление графом (БЕЗ персистентности!) |
| [`a2a-server/src/services/request-processor.service.ts`](../a2a-server/src/services/request-processor.service.ts) | Интеграция распознавания |
| [`docs/architecture-principles.md`](../docs/architecture-principles.md) | Архитектурные принципы |

---

## Что нужно изменить

### 1. GraphStore - убрать персистентность

**Было (неправильно):**
```typescript
// Сохранение в БД
await prisma.graphEntity.create({ ... });
```

**Должно быть:**
```typescript
// Граф только в памяти, возвращается в ответе
return { graph: { entities, relations } };
```

### 2. RequestProcessor - возвращать граф в ответе

**Нужно:**
```typescript
// В ответе всегда возвращать обновлённый граф
{
  outcome: "completed",
  graph: {
    entities: [...],
    relations: [...]
  },
  // Граф из контекста + новые сущности из codeBlocks
}
```

### 3. Контекст - принимать граф от клиента

**Нужно:**
```typescript
// Входящий контекст
{
  context: {
    project_path: "...",
    graph: {  // Граф от клиента
      entities: [...],
      relations: [...]
    },
    new_task: [...]
  },
  codeBlocks: [...]
}
```

---

## Следующие шаги

1. **Изменить GraphStore** - убрать PostgreSQL, оставить только in-memory
2. **Изменить RequestProcessor** - принимать граф из контекста, возвращать обновлённый
3. **Обновить типы** - добавить граф в контекст
4. **Протестировать** - отправить запрос с графом в контексте

---

## Принцип

```
Клиент: Хранит граф между запросами
        ↓
Запрос: context.graph + codeBlocks
        ↓
Сервер: Распознаёт новые сущности
        ↓
Ответ:  Обновлённый граф
        ↓
Клиент: Сохраняет граф для следующего запроса
```