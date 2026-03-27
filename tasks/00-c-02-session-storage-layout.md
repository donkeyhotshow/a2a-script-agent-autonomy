# C-02: Session Storage Layout Formalization

## Status
- [x] Completed

## Description
Formalize step-folder invariants (`client-result`, `request-to-server`, `server-response`, `messages`) and recovery rules, including explicit persistence rules for `system` role messages (Red Room auto-responses).

## Details
- Зафиксировать инварианты папок шагов
- Определить правила восстановления
- Добавить явные правила для system role messages (Red Room auto-responses)
- Обеспечить не-lossy персистентность

## Decision
Формализованы следующие инварианты и правила для session storage:

### Step-Folder Invariants
Каждая папка шага `a2a-client/storage/sessions/{sessionId}/{step}/` должна содержать:
- `client-result.json` — ввод пользователя или результат инструмента, записанный перед шагом
- `request-to-server.json` — payload, отправленный в A2A Server (контекст, результат и т.д.)
- `server-response.json` — финализированный execute/context/result от A2A Server (обязателен для завершенного шага)
- `messages.json` — пошаговая slice разговорной истории (обязателен для завершенного шага)
- `server-promise.json` — временное состояние для async ответов (удаляется после завершения)

### Recovery Rules
1. **Источник истины**: Наивысший номер шага, у которого уже существует `server-response.json`, определяет текущее состояние сессии
2. **Восстановление сессии**: 
   - Сначала пытаемся загрузить через `session-index.json` (быстрый путь)
   - Если индекс отсутствует или поврежден — fallback к сканированию шагов
   - Восстанавливаем `execute`, `context` и `status` из `server-response.json` самого высокого завершенного шага
   - Объединяем `messages.json` из всех шагов от 1 до текущего для полной истории
3. **Async State Preservation**: 
   - `promiseId` и `promiseStatus` сохраняются в `session-index.json` для устойчивости к перезагрузке страницы
   - При наличии pending promise, состояние сохраняется до завершения

### System Role Messages (Red Room Auto-Responses)
- **Явная поддержка**: История должна явно поддерживать роль `system` наравне с `user` и `assistant`
- **Не-lossy персистентность**: Системные сообщения должны сохраняться в `messages.json` без потерь или reordering
- **Рендер и хранение**: Рендер UI и механизмы хранения не должны терять системные сообщения
- **Валидация**: В симуляциях и тестах проверяется наличие системных сообщений в `messages.json` с правильной ролью

### Источники и ссылки
- Основная реализация: [`a2a-client/vite-plugin-a2a/storage/newSessions.js`](../a2a-client/vite-plugin-a2a/storage/newSessions.js)
- Документация контракта: [`a2a-client/docs/SESSION-STORAGE.md`](../a2a-client/docs/SESSION-STORAGE.md)
- Улучшения P1/P2: [`a2a-client/DEV_STATE.md:256-283`](../a2a-client/DEV_STATE.md)

## Source
- [a2a-client/DEV_STATE.md:184](../a2a-client/DEV_STATE.md)

## Owner
a2a-client session storage

## Verification
- Инварианты задокументированы
- Recovery rules работают
- System messages сохраняются без потерь