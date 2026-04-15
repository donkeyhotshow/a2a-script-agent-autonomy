# Plan: AI Integration UI Improvements

## Цель

Улучшить web UI для Promise Monitor в ai-integration/proxy/views.py.

## Текущее состояние

Текущий UI (`PROMISE_VIEW_HTML` в views.py):
- Базовый HTML с inline стилями
- Минимальный функционал: просмотр promise, отправка запросов
- Тёмная тема (background: #0f172a)
- Русский интерфейс

### Реализованные функции:
- ✅ Просмотр списка promise
- ✅ Просмотр отдельного promise
- ✅ Выполнение запроса (/ui/promises/<id>/execute)
- ✅ Отправка ответа (/ui/promises/<id>/respond)
- ✅ Queue viewer (/queue)

## Предлагаемые улучшения

### 1. Дизайн и UX
- [ ] Использовать CSS переменные для тем
- [ ] Добавить светлую тему
- [ ] Улучшить типографику
- [ ] Добавить анимации
- [ ] Адаптивный дизайн для мобильных

### 2. Функционал
- [x] История просмотренных promise
- [x] Поиск по promise ID
- [x] Фильтрация по статусу (pending, completed, failed)
- [ ] Автообновление списка
- [x] Копирование в буфер обмена

### 3. Отладка
- [x] Подсветка JSON
- [x] Форматирование request/response
- [x] Время выполнения
- [ ] Логи ошибок

### 4. Интеграция
- [ ] API для внешних инструментов

## Приоритеты

| Улучшение | Priority | Status |
|-----------|----------|--------|
| Подсветка JSON | P0 | ✅ |
| История просмотров | P1 | ✅ |
| Автообновление | P1 | ❌ |
| Светлая тема | P2 | ❌ |
| SSE integration | P2 | ❌ |

## Technical Notes

- UI находится в `ai-integration/proxy/views.py`
- HTML шаблон: `PROMISE_VIEW_HTML`
- API endpoints в `ai-integration/proxy/routes.py`:
  - `/ui/promises/next` — получить следующий promise
  - `/ui/promises/<id>/execute` — выполнить запрос
  - `/ui/promises/<id>/respond` — отправить ответ
  - `/queue` — просмотр очереди

## Status

🔄 В разработке — основные функции реализованы
