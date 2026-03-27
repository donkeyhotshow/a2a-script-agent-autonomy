# Client Code Consolidation Plan (STEP-BASED STORAGE)

> План по уменьшению клиентского кода через унификацию и упрощение.
> **Решение принято:** Хранение остаётся step-based.

## Выявленные области для консолидации

### 1. DTO/Projection Layer (Можно слить)

**Проблема:** 6 файлов делают похожие вещи

**Текущее:**
- `shared/web-execute-dto.mjs` (6KB) - реальная логика
- `routes/utils/execute-projection-dto.js` - proxy
- `routes/utils/web-execute-dto.js` - deprecated proxy
- `routes/utils/session-projection-dto.js` - session projection
- `routes/utils/web-session-dto.js` - deprecated proxy

**Решение:** Оставить только `shared/web-execute-dto.mjs` как single source of truth

---

### 2. Session Storage (УПРОСТИТЬ, НО STEP-BASED)

**Решение принято:** Хранение остаётся step-based.

**Проблема:** Сложная логика восстановления - need to find highest step, then merge multiple files

**Текущее:**
- `storage/newSessions.js` (9KB) - loadNewSession(), saveNewStep(), loadNewStep()
- `storage/projectSessions.js` (1.8KB) - project-specific
- Сложная логика: highest step → server-response → messages.json

**Предложение (step-based, validated):**

1. **session-index.json** - lightweight index для быстрого доступа
   - Пишется при каждом `saveNewStep()`
   - Читается первым при loadNewSession() → fast path
   - Fallback: если нет → существующая логика

2. **mode derivation** - вычисление режима, не хранение
   - Из `context.execution.action` (прямой флаг)
   - Fallback: если есть `workbench` → 'agent', иначе → 'dialog'

3. **Оптимизированный loadNewSession():**
```javascript
// Fast path: использовать index
const index = loadSessionIndex(cwd, sessionId);
if (index?.currentStep) {
  const step = loadNewStep(cwd, sessionId, index.currentStep);
  if (step) return reconstructFromStep(step, index);
}
// Fallback: существующая логика
```

**Плюсы step-based:**
- Историческая целостность
- Легче debug
- Меньше данных на запись
- Обратная совместимость (fallback if no index)

**Минусы (решаем):**
- Сложное восстановление → добавить index

---

### 3. Message Timeline Builder (Можно удалить)

**Проблема:** Сложная логика deduplication

**Текущее:**
- `routes/utils/message-timeline.js` (3.6KB)
- `collectCanonicalTimeline()` - 4 источника, приоритеты, dedupe
- `collectSessionMessagesFlat()` - результат

**Предложение:** Если хранить все сообщения в одном месте (вместо step-based), эта логика не нужна

---

### 4. Session State в Web (Можно слить)

**Проблема:** Два способа управления состоянием

**Текущее:**
- `web/js/session-store.js` (10KB) - глобальный SessionStore
- `web/js/session-data.js` (15KB) - createSessionStoreCore()
- `web/js/session-store-resolver.js` (1.3KB) - provider pattern

**Предложение:** Объединить session-data в session-store, убрать resolver если не используется

---

### 5. API Integration (Можно упростить)

**Текущее:**
- `web/js/api-integration.js` (8.9KB)
- Много методов: getSession, getSessions, createSession, submitSessionResult, etc.

**Предложение:** Проверить какие методы реально используются

---

## Roadmap: 3 фазы упрощения

### Фаза 1: Удалить deprecated (Безопасная)
1. Удалить `routes/utils/web-execute-dto.js` (уже deprecated)
2. Удалить `routes/utils/web-session-dto.js` (уже deprecated)
3. Обновить импорты

**Влияние:** Низкое - только совместимость

### Фаза 2: Упростить хранилище (STEP-BASED)
1. Добавить `session-index.json` - lightweight index
2. Объединить server-response + messages (optional)
3. Добавить mode flag в step файлы
4. Упростить loadNewSession() с использованием index

**Влияние:** Среднее - добавляем index, упрощаем восстановление

### Фаза 3: Упростить клиентский JS (Расширенная)
1. Объединить session-data.js → session-store.js
2. Проверить использование session-store-resolver
3. Упростить error-handler (крупнейший файл - 28KB)

**Влияние:** Высокое - меняется UI

---

## Расчёт уменьшения кода (Step-Based)

| Файл/Модуль | Размер | Действие |
|------------|--------|----------|
| web-execute-dto.js | 283b | Удалить (deprecated) |
| web-session-dto.js | 309b | Удалить (deprecated) |
| execute-projection-dto.js | 365b | Оставить thin bridge |
| message-timeline.js | 3.6KB | Упростить (использовать index) |
| newSessions.js | 9KB | Упростить (добавить index) |

**Ожидаемое уменьшение:** ~2KB deprecated + упрощение логики

---

## Что нужно сделать для реализации

### Необходимые решения
1. **Выбрать формат хранилища:** step-based → single file
2. **Определить mode:** Как определять agent vs dialog?
3. **Backward compatibility:** Как мигрировать старые сессии?

### Подготовка
1. Audit всех импортов web-execute-dto.js
2. Audit всех импортов web-session-dto.js  
3. Audit использования session-store-resolver
4. Audit использования message-timeline

---

## Приоритеты (Step-Based)

| Приоритет | Задача | Влияние |
|-----------|--------|---------|
| P0 | Удалить deprecated DTOs | Low (safe) |
| P1 | Добавить session-index.json для упрощения восстановления | Medium |
| P2 | Упростить message-timeline с использованием index | Low |
| P3 | Упростить newSessions.js логику | Medium |

---

## Связанные файлы

- [tasks/session-storage-analysis.md](session-storage-analysis.md) - анализ хранилища
- `a2a-client/vite-plugin-a2a/storage/newSessions.js` - текущая логика
- `a2a-client/vite-plugin-a2a/routes/utils/message-timeline.js` - timeline
- `a2a-client/web/js/session-store.js` - web state