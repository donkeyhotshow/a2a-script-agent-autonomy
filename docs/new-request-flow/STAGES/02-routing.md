# Этап 2: Маршрутизация (Роутинг)

## Описание

Сервер анализирует задачу пользователя и предлагает доступные варианты выполнения через форму выбора.

## Направление

**A2A Server → Client API → Web UI**

## Схема потока

```
Client API → request.json → Server
Server (Router) → response.json → Client API → received.json → Web UI
```

## Формат ответа сервера

### Server → Client API (новый формат - канон)

```typescript
interface FirstResponseFormChoices {
  context: {
    task: string;
    // НЕТ sessionId/projectId - сервер stateless!
  };
  execute: {
    form: {
      title?: string;
      choices: Array<{ id: string; label: string }>;
    };
  };
}
```

### Пример response.json

```json
{
  "context": {
    "task": "исправить импорты в Vue файлах"
  },
  "execute": {
    "form": {
      "title": "Оберіть спосіб виконання",
      "choices": [
        {
          "id": "fix-vue-imports",
          "label": "Виправити зламані імпорти у Vue файлах (автомат)"
        },
        {
          "id": "auto-ai",
          "label": "AI Action Generator — згенерувати екшен за допомогою LLM"
        },
        {
          "id": "task-decomposition",
          "label": "Ручна декомпозиція задачі"
        }
      ]
    }
  }
}
```

## Legacy формат (не рекомендуется)

Ранее использовался формат с `actions[]` и `fallbackActions[]`:
- **Deprecated**: использовать только для совместимости
- **Рекомендация**: переходить на `execute.form.choices` + `result.choice`

## Обработка на Client API

1. Получение ответа от сервера
2. Рендеринг формы выбора в Web UI
3. Ожидание выбора пользователя

## Выбор пользователя

### Web → Client API

```json
{
  "result": {
    "choice": "fix-vue-imports"
  }
}
```

## Правила сортировки choices

| Приоритет | Тип | Примеры |
|-----------|-----|---------|
| Высокий | Deterministic Actions | fix-vue-imports, phpunit-deprecations |
| Низкий | AI-Actions | auto-ai, coder, dialog |

## Следующий этап

После выбора пользователя переходит к [Этап 3: Выполнение действия](03-execution.md)

## References

- [PROTOCOL.md](../PROTOCOL.md)
- [SCHEMAS.md](../SCHEMAS.md)
- [simulations/SCHEMA.md](../../simulations/SCHEMA.md)
- [server-invoke-response-first-form.schema.json](../json-schemas/server-invoke-response-first-form.schema.json)
