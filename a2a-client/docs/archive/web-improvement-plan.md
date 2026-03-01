# План: Доработка Web интерфейса A2A Client

## Цель

Доработать и улучшить веб-интерфейс A2A Client, создав единую спецификацию "Gold Standard" и реализовав ключевые улучшения.

## Текущее состояние

### Существующие компоненты

| Компонент | Файл | Статус |
|-----------|------|--------|
| Основной UI | `index.html` | ✅ Работает |
| Plasticine UI | `plasticine-ui.js` | ✅ Работает |
| VueFlow интеграция | `js/flow/` | ✅ Работает |
| API клиент | `web-api-client.js` | ✅ Работает |
| SSE клиент | `sse-client.js` | ✅ Работает |
| Управление сессиями | `sessions.js` | ✅ Работает |
| Doc Panels | `doc-panels.js` | ❌ Не реализовано |

### Проблемы

1. **Нет единой спецификации** - разные компоненты используют разные паттерны
2. **Doc Panels не реализованы** - функционал для открытия документации из интерфейса
3. **Нет Markdown рендеринга** - документация отображается как raw text
4. **Частичная поддержка Accessibility** - нужно улучшить
5. **Нет mobile-first подхода** - нужно доработать адаптивность

---

## План улучшений

### Фаза 1: Реализация Doc Panels (Высокий приоритет)

#### 1.1 Базовый функционал Doc Panels

- [ ] Создать модуль `doc-panels.js`
- [ ] Определить `DOC_LIST` с ключами документов
- [ ] Реализовать `openDocPanel(docKey)` функцию
- [ ] Добавить проверку "уже открыт" по ID панели

#### 1.2 Header форма

- [ ] Добавить форму `#docOpenForm` в header
- [ ] Добавить input `#docOpenInput` с placeholder
- [ ] Заполнить datalist из `DOC_LIST` ключей
- [ ] Обработать submit формы

#### 1.3 Container для панелей

- [ ] Создать `#panels-container` в основном layout
- [ ] Реализовать рендер панелей как `.pui-panel`
- [ ] Добавить кнопки minimize/close

#### 1.4 Загрузка контента

- [ ] Интегрировать с `vite-plugin-a2a` API
- [ ] Загружать контент по пути `/api/a2a/projects/default/files/{path}`
- [ ] Обработать ошибки 404

### Фаза 2: Markdown рендеринг

#### 2.1 Подключение библиотеки

- [ ] Добавить `marked` или `remark` зависимость
- [ ] Настроить санитизацию HTML

#### 2.2 Рендеринг

- [ ] Конвертировать MD в HTML в `.pui-doc-content`
- [ ] Добавить базовые стили для Markdown
- [ ] Поддержка кодовых блоков с подсветкой

### Фаза 3: UI Улучшения

#### 3.1 Accessibility

- [ ] Добавить ARIA атрибуты
- [ ] Реализовать keyboard navigation
- [ ] Добавить screen reader support

#### 3.2 Mobile-first

- [ ] Адаптировать layout для мобильных
- [ ] Добавить responsive breakpoints
- [ ] Оптимизировать touch interactions

#### 3.3 Темизация

- [ ] Расширить CSS переменные
- [ ] Поддержать light/dark mode
- [ ] Добавить тему plasticine

### Фаза 4: VueFlow улучшения

#### 4.1 Custom Nodes

- [ ] Добавить больше типов узлов
- [ ] Улучшить визуализацию
- [ ] Добавить анимации

#### 4.2 Интерактивность

- [ ] Улучшить drag & drop
- [ ] Добавить zoom controls
- [ ] Реализовать minimap

---

## Файлы для изменения

### Новые файлы

```
a2a-client/web/js/
├── doc-panels.js    # NEW - Doc Panels модуль
```

### Изменяемые файлы

```
a2a-client/web/
├── index.html       # ADD - Doc form, panels container
├── css/style.css    # ADD - Doc panels styles, MD styles
├── css/plasticine-ui.css  # ADD - Theme improvements
└── js/sessions.js   # ADD - Doc panels integration
```

---

## Критерии готовности

- [ ] Doc Panels открывают документацию из интерфейса
- [ ] Markdown корректно рендерится
- [ ] Accessibility score > 90
- [ ] Mobile responsive работает
- [ ] Lighthouse score > 80

---

## Приоритеты реализации

| Приоритет | Задача | Сложность | Время |
|-----------|--------|-----------|-------|
| HIGH | Doc Panels базовый функционал | Medium | 2 дня |
| HIGH | Markdown рендеринг | Low | 1 день |
| MEDIUM | Accessibility | Medium | 2 дня |
| MEDIUM | Mobile-first | Medium | 2 дня |
| LOW | VueFlow улучшения | High | 3 дня |

---

**Дата:** 2026-02-26
**Статус:** PENDING
