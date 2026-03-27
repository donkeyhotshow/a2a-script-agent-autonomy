# DEV_STATE - simulations (2026-03-27)

## ⚠️ КРИТИЧЕСКИЕ ИЗМЕНЕНИЯ

### Симуляции и новый формат

Симуляции обновлены для поддержки **нового формата протокола**:
- Action-key shape для execute/result
- Context fields: execution, history, workbench
- Step-based storage
- Server transforms (server-transforms-request.json, server-transforms-response.json)

---

## Структура симуляций

Симуляции организованы по типам задач и сценариям использования:

| Категория          | Примеры                                | Назначение                   |
|--------------------|----------------------------------------|------------------------------|
| **AI Actions**     | `agent-auto-ai/`, `agent-coder-smart/` | Тестирование AI-driven flows |
| **Code Analysis**  | `agent-analyze/`, `agent-coder/`       | Анализ и генерация кода      |
| **Debugging**      | `debug-dialog/`                        | Отладка диалогов             |
| **UI Fixes**       | `fix-vue-imports/`                     | Исправление Vue.js проблем   |
| **Initialization** | `init/`                                | Инициализация системы        |
| **Orchestration**  | `orchestrator-dialog/`                 | Оркестрация компонентов      |

---

## Формат симуляций (НОВЫЙ)

### Обязательные файлы

Каждая симуляция содержит:

| Файл | Назначение | Формат |
|------|------------|--------|
| `request.json` | Входные данные | Server invoke request schema |
| `request.md` | Человеко-читаемая версия запроса | Markdown с JSON embedded |
| `response.json` | Ответ от сервера | action-key shape (execute + context + result) |
| `response.md` | Человеко-читаемая версия ответа | Markdown с JSON embedded |

### Дополнительные файлы

| Файл | Назначение |
|------|------------|
| `server-transforms-request.json` | Трансформация запроса |
| `server-transforms-response.json` | Трансформация ответа |
| `received.json` | Web execute DTO (form/message/attachments) |
| `interrupt.md` | Server interrupt loop documentation |
| `N-sub-M/` folders | Server interrupt loop steps |

### Action-Key Shape (ОБЯЗАТЕЛЬНО)

```json
{
  "execute": {
    "form": { "title": "...", "choices": [...] },
    "script": { "input": {...}, "code": "..." },
    "read-file": { "path": "..." },
    "rag-search": { "query": "..." }
  },
  "context": {
    "version": "...",
    "session_id": "...",
    "execution": { "action": "...", "step": "...", "progress": 0 },
    "history": [...],
    "workbench": { "sections": {...} }
  },
  "result": {
    "choice": "dialog",
    "message": "..."
  }
}
```

---

## Ключевые симуляции

### AI Action симуляции

- **auto-ai**: Базовый AI action flow
- **agent-coder-smart**: Продвинутый кодогенератор (legacy: coder-smart)
- **agent-analyze**: Анализ кода и архитектуры (legacy `analyze/` → `agent-analyze/`)

### Code симуляции

- **coder**: Генерация кода
- **fix-vue-imports**: Исправление импортов Vue
- **fix-vue-imports-batched**: Пакетная обработка

---

## Валидация симуляций

### sim-lint

Проверка формата симуляций:
```bash
npm run sim:lint -- --all --json
cd a2a-server && npm run sim:lint -- --all --json
```

### sim-validate

Валидация конкретной симуляции:
```bash
npm run sim:validate -- --sim <name> --json
cd a2a-server && npm run sim:validate -- --sim <name> --json
```

---

## Статус и использование

- **Сценарные папки:** 17 верхнеуровневых каталогов под `simulations/` (+ `_audit`); `sim-lint --all` регистрирует **89** корней шагов/сценариев.
- **Назначение goldens:** см. [`SERVER-CONTRACT.md`](./SERVER-CONTRACT.md) — симуляции показывают **контракт** и поведение системы в sync-цепочке; отдельно — границы (async, E2E).
- **Последнее обновление:** 2026-03-27
- **Использование:** Golden standard + `sim:lint` / `sim:validate`

---

## Общая архитектура системы

Общая архитектура системы описана в [`DEV_STATE.md`](../DEV_STATE.md).

---

## Ссылки

- [Спецификация протокола](../docs/new-request-flow/PROTOCOL.md)
- [Simulation Format](../docs/new-request-flow/SIMULATION-FORMAT.md)
- [SCHEMA.md](../docs/new-request-flow/SCHEMAS.md)

---

*Обновлено: 2026-03-27*