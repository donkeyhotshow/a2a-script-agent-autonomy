# Схема действий сессий (Session Actions Schema)

## Обзор

Определяет формат данных для расширенного управления сессиями на Web UI.

## Определения

### 1. SessionPauseAction

Приостановка активной сессии.

```json
{
  "action": "session-pause",
  "sessionId": "sess_abc123",
  "reason": "Перерыв в работе"
}
```

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| sessionId | string | Да | ID сессии |
| reason | string | Нет | Причина приостановки |

### 2. SessionResumeAction

Возобновление приостановленной сессии.

```json
{
  "action": "session-resume",
  "sessionId": "sess_abc123"
}
```

### 3. SessionCloneAction

Клонирование существующей сессии.

```json
{
  "action": "session-clone",
  "sessionId": "sess_abc123",
  "newTitle": "Клон сессии",
  "includeHistory": true
}
```

**Параметры:**
| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| sessionId | string | Да | ID оригинальной сессии |
| newTitle | string | Нет | Новое название |
| includeHistory | boolean | Нет | Включить историю (по умолчанию true) |

### 4. SessionExportAction

Экспорт сессии в файл.

```json
{
  "action": "session-export",
  "sessionId": "sess_abc123",
  "format": "json",
  "includeOptions": {
    "context": true,
    "history": true,
    "messages": true,
    "metadata": true
  }
}
```

**Форматы:**
- `json` - полный экспорт в JSON
- `markdown` - человекочитаемый отчет
- `html` - HTML представление

### 5. SessionImportAction

Импорт сессии из файла.

```json
{
  "action": "session-import",
  "data": "{\"task\": \"...\", \"context\": {...}}",
  "projectId": "proj_12345",
  "newTitle": "Импортированная сессия"
}
```

### 6. SessionNotesAction

Управление заметками сессии.

```json
{
  "action": "session-notes",
  "sessionId": "sess_abc123",
  "notes": "# Мои заметки\n\nВажная информация...",
  "operation": "set"
}
```

**Операции:**
- `set` - установить заметки (перезаписать)
- `append` - добавить к существующим
- `clear` - очистить заметки

### 7. BatchSessionAction

Групповые операции над несколькими сессиями.

```json
{
  "action": "batch",
  "sessionIds": ["sess_abc123", "sess_def456", "sess_ghi789"],
  "operation": "delete"
}
```

**Операции:**
- `delete` - удалить все сессии
- `pause` - приостановить все
- `resume` - возобновить все
- `archive` - архивировать все

---

## Результаты

### SessionPauseResult

```json
{
  "sessionId": "sess_abc123",
  "status": "paused",
  "pausedAt": "2024-01-01T12:00:00.000Z"
}
```

### SessionResumeResult

```json
{
  "sessionId": "sess_abc123",
  "status": "in_progress",
  "resumedAt": "2024-01-01T12:30:00.000Z"
}
```

### SessionCloneResult

```json
{
  "originalSessionId": "sess_abc123",
  "newSessionId": "sess_clone789",
  "title": "Клон сессии"
}
```

### SessionExportResult

```json
{
  "sessionId": "sess_abc123",
  "format": "json",
  "data": "{\"task\": \"...\", ...}",
  "fileName": "session-abc123-export.json"
}
```

### SessionNotesResult

```json
{
  "sessionId": "sess_abc123",
  "notes": "# Мои заметки...",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### BatchSessionResult

```json
{
  "operation": "delete",
  "total": 3,
  "success": 2,
  "failed": 1,
  "results": [
    { "sessionId": "sess_abc123", "success": true },
    { "sessionId": "sess_def456", "success": true },
    { "sessionId": "sess_ghi789", "success": false, "error": "Session not found" }
  ]
}
```

---

## References

- [session-management-protocols.md](../../plans/session-management-protocols.md)
- [SCHEMAS.md](../SCHEMAS.md)
