# План: Создание Unified JSON Frontend Framework

## Введение

Этот план описывает создание унифицированного JSON frontend фреймворка для гибкости в условиях данного проекта.

**Цель:** Создать единый JSON-стандарт для UI компонентов и данных, используя эталонные ответы сервера.

## 1. Анализ текущей структуры

### 1.1 a2a-server (C:\workspace\org-carrier\a2a-script-agent\a2a-server)

```
a2a-server/src/
├── actions/                  # Основная логика экшенов
│   ├── definitions/         # MD файлы с экшенами
│   │   ├── fix-vue-imports.md
│   │   ├── analysis/        # 8 экшенов анализа
│   │   ├── generation/      # 7 экшенов генерации
│   │   ├── graph/          # 6 экшенов графа
│   │   ├── hybrid/         # 4 гибридных экшена
│   │   ├── context/        # 5 экшенов контекста
│   │   └── yaml/           # YAML определения
│   ├── action-processor.ts # Обработчик экшенов
│   ├── action-registry.ts  # Реестр экшенов
│   ├── action-service.ts   # Сервис экшенов
│   ├── action-executor.ts  # Исполнитель шагов
│   └── dsl/               # DSL парсер и валидатор
├── services/               # Бизнес-логика
│   ├── request-processor.service.ts  # Обработка запросов
│   ├── context-manager.service.ts     # Управление контекстом
│   ├── message.service.ts             # Сообщения
│   ├── phase-machine.service.ts      # Фазовая машина
│   └── graph-store.service.ts         # Хранение графа
├── protocol/               # Протокол коммуникации
├── types/                  # TypeScript типы
├── controllers/           # HTTP контроллеры
└── websocket/             # WebSocket обработка
```

**Всего:** ~30+ экшенов

### 1.2 a2a-client (C:\workspace\org-carrier\a2a-script-agent\a2a-client)

```
a2a-client/
├── packages/
│   ├── api-client/          # API клиент
│   ├── agent/               # Агент
│   ├── fs-utils/            # Файловые утилиты
│   ├── rag/                 # RAG поиск
│   └── script-runner/      # Исполнитель скриптов
├── web/                     # Frontend (Vue + VueFlow)
│   ├── js/flow/
│   │   ├── index.js
│   │   ├── nodes.js
│   │   └── protocol.js
│   └── css/
└── tests/                   # Тесты
```

### 1.3 Legacy: admin-app (C:\workspace\org-carrier\a2a-script-agent\a2a-client\source-of-core\admin-app)

- Vue 2 приложение с Laravel бэкендом
- Содержит ценные примеры UI компонентов
- JSON структуры для данных

## 2. Unified JSON подход

### 2.1 Что такое Unified JSON?

Unified JSON - это единый формат для представления:
- UI компонентов (кнопки, формы, таблицы)
- Данных (списки, деревья, графы)
- Команд (экшены, действия)
- Состояний (прогресс, ошибки, результаты)

### 2.2 Примеры эталонных ответов сервера

**Action Proposal (task_request):**
```json
{
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "title": "Исправить сломанные импорты",
      "subActions": [...]
    }
  ]
}
```

**Executing Action:**
```json
{
  "executingAction": {
    "actionId": "collect",
    "title": "Collect Vue and TypeScript files"
  },
  "nextSteps": [...]
}
```

### 2.3 Преимущества подхода

1. **Гарантия совместимости** - клиент всегда понимает ответ сервера
2. **Легкость тестирования** - JSON легко валидировать
3. **Расширяемость** - можно добавлять новые поля без слома клиента
4. **Документированность** - схемы служат документацией

## 3. План реализации

### Фаза 1: Исследование (1 неделя)

- [ ] Изучить все существующие экшены в a2a-server
- [ ] Собрать примеры ответов сервера
- [ ] Проанализировать admin-app структуру
- [ ] Определить базовые типы данных

### Фаза 2: Определение схем (1 неделя)

- [ ] Создать JSON Schema для каждого типа ответа
- [ ] Определить обязательные и опциональные поля
- [ ] Документировать все поля
- [ ] Создать TypeScript типы

### Фаза 3: Симуляции (2 недели)

- [ ] Создать симуляции для каждого реального экшена
- [ ] Запустить все симуляции
- [ ] Проверить соответствие схемам
- [ ] Исправить расхождения

### Фаза 4: Frontend интеграция (2 недели)

- [ ] Создать парсеры для каждого типа ответа
- [ ] Реализовать генерацию UI из JSON
- [ ] Интегрировать с VueFlow
- [ ] Добавить валидацию

### Фаза 5: Тестирование и документирование (1 неделя)

- [ ] Написать E2E тесты
- [ ] Создать документацию
- [ ] Провести ревью
- [ ] Исправить баги

## 4. Критерии успеха

### Обязательные:
- [ ] Все экшены возвращают валидный JSON
- [ ] Схемы покрывают 100% полей
- [ ] Frontend корректно отображает все типы ответов

### Дополнительные:
- [ ] Есть документация для каждого поля
- [ ] Есть примеры использования
- [ ] Есть миграционный план для admin-app

## 5. Технологии

- **Frontend:** Vue 3, VueFlow, TypeScript
- **Валидация:** Zod, JSON Schema
- **Тестирование:** Vitest, Playwright
- **Документация:** Markdown, TypeDoc

## 6. Связанные документы

- [a2a-server/plans/simulations-and-unified-json-frontend-plan.md](../a2a-server/plans/simulations-and-unified-json-frontend-plan.md) - План симуляций
- [simulation-framework-plan.md](./simulation-framework-plan.md) - Симуляционный фреймворк
- [vueflow-migration-plan.md](./vueflow-migration-plan.md) - Миграция на VueFlow

## 7. Следующие шаги

1. Начать с Фазы 1: Исследование
2. Определить 10 ключевых экшенов для тестирования
3. Создать первую симуляцию

---

**Дата создания:** 2026-02-25
**Статус:** В работе
