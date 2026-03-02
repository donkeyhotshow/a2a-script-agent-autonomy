# TODO - Implementation Plan

## HIGH PRIORITY

### 1. Добавить недостающие HTML элементы в index.html

- [x] actionFormContainer - контейнер формы выполнения действия
- [x] actionCategoryFilter - фильтр категорий в Action Panel
- [x] Дополнительные поля в Node Editor Modal (type, description, posX, posY)
- [x] action-panel-filters - контейнер для поиска и фильтра
- [ ] Projects modal elements
- [ ] Import/Export modal elements

### 2. Исправить цепочку инициализации

- [ ] Обновить app-boot.js для правильной загрузки модулей
- [ ] Добавить порядок загрузки скриптов
- [ ] Подключить все необходимые обработчики

### 3. Добавить критические CSS стили

- [x] Стили для Action Panel (уже есть в style.css)
- [x] Стили для Task Queue (уже есть в style.css)
- [x] Стили для Statistics Panel (уже есть в style.css)
- [x] Стили для Command Palette результатов
- [x] Стили для форм

## MEDIUM PRIORITY

### 4. Подключить кнопки toolbar к flowManager

- [x] graphZoomIn/Out
- [x] graphFitView
- [x] graphUndo/Redo
- [x] graphToggleMinimap/Console/Properties

### 5. Расширить функциональность

- [ ] Drag-and-drop узлов
- [ ] Группировка узлов
- [ ] Улучшенный поиск

## LOW PRIORITY

### 6. Дополнительные компоненты

- [ ] Timeline view
- [ ] Code preview

## Выполнено:

### 1. HTML элементы добавлены:

- actionFormContainer - ✅
- actionCategoryFilter - ✅
- action-panel-filters - ✅
- Node Editor: type, description, posX, posY - ✅

### 2. CSS стили:

- Все стили уже присутствуют в style.css

### 3. Инициализация:

- Task Queue Manager - инициализируется в index.html
- Graph Statistics Manager - инициализируется в index.html
- Action Panel - инициализируется в index.html
- Batch Operations Manager - инициализируется в index.html

### Осталось сделать:

1. Исправить цепочку инициализации в app-boot.js
2. Добавить Projects modal элементы
3. Добавить Import/Export modal элементы
4. Расширить функциональность drag-drop
