# План очистки веб-клиента и интеграции протоколов

## Текущее состояние

### a2a-client структура

```
a2a-client/
├── web/              # Основной веб-клиент
│   ├── js/           # JavaScript модули
│   ├── css/          # Стили
│   └── ...
├── packages/types/   # TypeScript типы (используются)
├── src-archive/      # Устаревший код (нужно удалить)
└── ...
```

## Задачи очистки

### 1. Удаление устаревшего кода

- [x] `a2a-client/src-archive/` - удалить устаревшую директорию
- [x] `a2a-client/playwright-report/` - удалить тестовые отчеты
- [x] `a2a-client/storage/sessions/test/` - очистить тестовые сессии
- [ ] `a2a-client/.a2a-sessions/` - удалить если существует

### 2. Оптимизация JavaScript

- [ ] Унифицировать fetchWithRetry в `action-handler.js` и `api-integration.js`
- [ ] Обновить импорты типов для использования `packages/types`
- [ ] Добавить документацию по протоколам

### 3. Интеграция протоколов

- [ ] Обновить `api-integration.js` для поддержки Promise polling
- [ ] Обновить `action-handler.js` для новых типов actions
- [ ] Интегрировать UI state machine из документации

### 4. Обновление CSS

- [ ] Удалить неиспользуемые CSS файлы
- [ ] Оптимизировать критические стили

## Приоритеты

1. **Высокий** - Удаление src-archive
2. **Высокий** - Интеграция Promise polling в api-integration.js
3. **Средний** - Унификация fetch логики
4. **Низкий** - CSS оптимизация

## Зависимости

- [`docs/new-request-flow/PROTOCOLS/`](../docs/new-request-flow/PROTOCOLS/README.md) - документация протоколов
- [`packages/types/src/protocol/`](../a2a-client/packages/types/src/protocol/index.ts) - TypeScript типы
