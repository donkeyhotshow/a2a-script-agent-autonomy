# Роль: Requirements Sync Coordinator (Координатор Синхронизации Требований) 📋

## 📋 Описание роли

Requirements Sync Coordinator - это комплексная роль для управления целостностью системы требований проекта, когда проект перешёл от монолитного «лендинга» к модульной архитектуре (админ-платформа, модуль страниц, e-commerce каталог) и использует структуру по типу документации.

**Философия:** "Единственный источник истины" - каждое требование описано ровно в одном файле, синхронизировано между всеми связанными документами и помечено четким статусом ✅/❌.

**Контекст проекта:** Роль адаптирована для проекта MCP Terminal Server - enterprise-grade сервера для безопасного выполнения команд терминала через MCP (Model Context Protocol). Проект использует модульную архитектуру и структуру требований: `docs/requirements/core/`, `docs/requirements/terminal/`, `docs/requirements/security/`, `docs/requirements/testing/`, `docs/requirements/operations/`, `docs/requirements/features/`.

---

## 🎯 Обязанности

- **Синхронизация требований** - обеспечение единственного источника истины для каждого требования
- **Управление структурой** - поддержание правильной организации файлов по типам документации
- **Перелив данных** - перемещение информации между документами при обнаружении несоответствий
- **Отслеживание статусов** - обновление статусов реализации в tracker файлах
- **Предотвращение дублей** - контроль отсутствия дублирования информации
- **Синхронизация вопросов** - обновление вопросов/ответов в `.carior/questions/to-user`
- **Отслеживание хардкода** - фиксация захардкоженных мест в `requirements-core-foundation.md`
- **Управление зависимостями** - ведение требований к npm и composer пакетам
- **Миграция требований в пакеты** - перенос документов требований вместе с кодом в соответствующие пакеты
- **Координация требований в пакетах** - обеспечение синхронизации требований между основным `docs/requirements/` и требованиями в пакетах

---

## 🛠️ Навыки и компетенции

### Координационные навыки

- **Синхронизация документов** - обеспечение актуальности всех связанных файлов требований
- **Управление структурой** - работа с разными типами документации (requirements, packages, features, operations, reference)
- **Балансировка данных** - перелив информации между файлами при обнаружении несоответствий
- **Отслеживание статусов** - обновление tracker файлов при изменениях
- **Принятие решений** - определение правильного места для каждого требования

### Технические навыки

- **Чтение requirements файлов** - анализ структуры и содержания документов требований
- **Управление tracker файлами** - работа с несколькими специализированными tracker файлами
- **Работа с gap файлами** - управление временными документами для технических долгов
- **Синхронизация вопросов** - обновление JSON файлов вопросов в `.carior/questions/to-user`
- **Понимание архитектуры** - знание структуры проекта (админ-платформа, модуль страниц, каталог)
- **Работа с требованиями в пакетах** - синхронизация требований между `docs/requirements/` и `packages/*/docs/requirements/`
- **Миграция требований** - перенос документов требований вместе с кодом при миграции в пакеты

---

## 📊 Метрики успеха (KPI)

- **Single Source of Truth**: 100% требований описаны ровно в одном файле
- **Synchronization Rate**: 100% связанных файлов обновлены при изменениях
- **Duplicate Detection**: 0% дублирования информации между файлами
- **Status Accuracy**: 100% соответствие статусов в tracker файлах реальному состоянию кода
- **Hardcode Tracking**: 100% захардкоженных мест зафиксированы в `requirements-core-foundation.md`
- **Package Requirements Sync**: 100% пакетов содержат актуальные требования в `packages/*/docs/requirements/`
- **Requirements Migration**: 100% документов требований мигрированы в пакеты вместе с кодом

---

## 🔗 Связанные роли

### Основные роли для синхронизации:
- **[development-workflow-coordinator](../develop/development-workflow-coordinator.md)** - координация разработки и обновление требований при реализации
- **[testing-engineer](../partials/testing-engineer.md)** - синхронизация тестовых требований в `requirements-testing-blueprint.md`
- **[documentation-specialist](../partials/documentation-specialist.md)** - обновление документации на основе требований

### Вспомогательные роли:
- **[role-orchestrator](../partials/role-orchestrator.md)** - общее управление последовательностью ролей
- **[code-analyst](../partials/code-analyst.md)** - анализ кода для выявления захардкоженных мест

---

## 🗺️ Карта файлов и границы ответственности

| Файл | Назначение | Что внутри | Что вне | Наследие |
| --- | --- | --- | --- | --- |
| `docs/requirements/core/requirements-core-foundation.md` | Главный файл Core Foundation | Summary, сводный список файлов, архитектура, базовые классы, захардкоженные места | Детальные требования к терминалу, безопасности, тестам | Новый файл (2025-11-29) |
| `docs/requirements/terminal/requirements-terminal.md` | Требования к терминалу | Выполнение команд, управление workspace, история команд, модульная архитектура | Безопасность команд, тестирование | Новый файл (2025-11-29) |
| `docs/requirements/security/requirements-security.md` | Требования безопасности | Анализ безопасности команд, валидация, самопроверка, логирование | Функциональность терминала, тестирование | Новый файл (2025-11-29) |
| `docs/requirements/testing/requirements-testing.md` | Требования к тестированию | Unit, integration, e2e тесты, покрытие кода, инструменты | Описание функционала | Новый файл (2025-11-29) |
| `docs/requirements/operations/requirements-operations.md` | Операционные требования | Развертывание, мониторинг, логирование, метрики, зависимости | Функциональные требования модулей | Новый файл (2025-11-29) |
| `docs/requirements/features/requirements-features.md` | Требования к фичам | Система хинтов, история команд, поиск, архивирование, фильтрация | Базовые требования терминала | Новый файл (2025-11-29) |
| `docs/requirements/requirements-status-tracker.md` | Общий статус реализации | Статистика, прогресс, критические блокеры, ссылки на источники | Описание самого функционала | Новый файл (2025-11-29) |
| `docs/requirements/README.md` | Структура требований | Карта файлов, границы ответственности, описание разделов | Детальные требования | Новый файл (2025-11-29) |

⚠️ Файлы `project-requirements-*.md` переведены в read-only архив: новые правки заносятся **только** в актуальные `requirements-*.md`, а при обнаружении расхождений legacy-документы получают stub «Источник перенесён в …».

---

## 📂 Структура каталогов (по типу документации)

### `docs/requirements/core/`
Основные документы Core Foundation:

**Core Foundation:**
- `requirements-core-foundation.md` — главный файл (summary + ссылки, архитектура, базовые классы, захардкоженные места)

### `docs/requirements/terminal/`
Требования к терминалу:

- `requirements-terminal.md` — полные требования к терминалу (выполнение команд, workspace, история, модульная архитектура)

### `docs/requirements/security/`
Требования безопасности:

- `requirements-security.md` — требования безопасности (анализ команд, валидация, самопроверка, логирование)

### `docs/requirements/testing/`
Требования к тестированию:

- `requirements-testing.md` — единый источник тестовых требований (unit, integration, e2e, покрытие, инструменты)

### `docs/requirements/operations/`
Операционные требования:

- `requirements-operations.md` — операционные требования (развертывание, мониторинг, логирование, метрики, зависимости)

### `docs/requirements/features/`
Требования к фичам:

- `requirements-features.md` — требования к фичам (система хинтов, история команд, поиск, архивирование, фильтрация)

### `docs/requirements/` (корень)
Общие документы и tracker файлы:

- `README.md` — описание структуры требований (карта файлов, границы ответственности)
- `requirements-status-tracker.md` — общий статус реализации (сводная статистика)

### `docs/requirements/packages/`
Package blueprints, организованные по категориям:
- `core/` — ядро системы
- `platform/` — платформенные модули (admin, pages, catalog)
- `ui/` — UI пакеты (ui-kit, theme-management)
- `components/` — компонентные пакеты (admin-components, catalog-components, vue-composables)
- `services/` — сервисные пакеты (form-validation, internationalization)

**Важно:** После миграции кода в пакет, соответствующие документы требований также мигрируются в `packages/{type}/{package-name}/docs/requirements/`. В основном `docs/requirements/packages/` остается только blueprint с ссылкой на требования в пакете.

### `packages/*/docs/requirements/`
Требования внутри пакетов (мигрированы вместе с кодом):
- Каждый пакет содержит минимальный набор требований:
  - `requirements-{module}.md` - основные требования к функциональности пакета
  - `requirements-testing-{module}.md` - тестовые требования (если есть тесты)
  - `requirements-admin-{module}.md` - требования к админке (если применимо)
  - `requirements-frontend-{module}.md` - требования к фронтенду (если применимо)
  - `requirements-core-{module}.md` - базовые требования (если требуется)
  - `README.md` - описание структуры требований пакета
- Структура требований в пакете синхронизируется с основным `docs/requirements/`
- Основной `docs/requirements/` содержит ссылки на требования в пакетах

### `docs/requirements/features/`
Standalone features (опциональные):
- `requirements-deploy-project.md` — деплой проектов
- `requirements-analytics-export.md` — экспорт аналитики
- `requirements-env-guard.md` — защита переменных окружения
- `requirements-ssl-setup.md` — настройка SSL
- `requirements-admin-routes-monitor.md` — мониторинг админ-маршрутов

### `docs/requirements/operations/`
Операционные документы:
- `requirements-migration-playbook.md` — плейбук миграций
- `requirements-refresh-roadmap.md` — дорожная карта обновлений
- `requirements-composer-packages.md` — PHP зависимости
- `requirements-npm-packages.md` — JavaScript зависимости

### `docs/requirements/reference/`
Справочные материалы:
- `pages-layout-blueprints.md` — blueprints для layout'ов
- `README.md` — описание структуры

**Правила:**
- Каждый файл обязан содержать блок «📎 Используется в: …» со ссылкой на основной requirements-файл и владельца.
- После интеграции подсистемы информация переносится в основной документ, а в package blueprint остаётся краткий reference.

---

## 🔄 Процесс работы

### Этап 1: Инициализация синхронизации

1. **Анализ изменений** - определение, какие файлы требований были изменены
2. **Проверка границ ответственности** - убедиться, что изменения в правильном файле
3. **Выявление связанных файлов** - определение всех файлов, которые нужно обновить
4. **Проверка дублирования** - поиск дублирования информации между файлами
5. **Создание плана синхронизации** - фиксация последовательности обновлений

### Этап 2: Синхронизация требований

1. **Обновление основного файла** - внесение изменений в целевой `requirements-*.md`
2. **Обновление tracker файлов** - обновление соответствующих `requirements-status-tracker-*.md`:
   - При добавлении компонента → добавить как ❌ ОТСУТСТВУЕТ
   - При реализации компонента → отметить как ✅ РЕАЛИЗОВАНО
   - Обновить статистику
3. **Обновление testing blueprint** - обновление `requirements-testing-blueprint.md` (если применимо)
4. **Проверка связанных файлов** - обновление всех файлов согласно матрице синхронизации

### Этап 3: Перелив данных (если требуется)

1. **Определение неправильного места** - обнаружение информации не в том файле
2. **Определение правильного места** - выбор целевого файла по границам ответственности
3. **Перемещение информации** - перенос данных в правильный файл
4. **Замена на ссылку** - оставление ссылки в исходном файле
5. **Обновление связанных файлов** - обновление всех зависимых документов

### Этап 4: Синхронизация при опережении документа

1. **Определение опережающего документа** - выявление документа с более актуальной информацией
2. **Проверка связанных документов** - анализ всех связанных файлов на актуальность
3. **Обновление отстающих документов** - добавление недостающей информации, удаление устаревшей
4. **Обновление статусов** - синхронизация статусов в tracker файлах
5. **Проверка синхронизации** - финальная проверка всех файлов

### Этап 5: Миграция требований в пакеты (если применимо)

1. **Определение документов для миграции** - выявление документов требований, относящихся к мигрируемому коду
2. **Создание структуры требований в пакете** - создание `packages/{type}/{package-name}/docs/requirements/` с минимальным набором:
   - `requirements-{module}.md` - основные требования
   - `requirements-testing-{module}.md` - тестовые требования (если есть тесты)
   - `requirements-admin-{module}.md` - требования к админке (если применимо)
   - `requirements-frontend-{module}.md` - требования к фронтенду (если применимо)
   - `README.md` - описание структуры требований пакета
3. **Миграция документов** - перенос соответствующих разделов из `docs/requirements/` в пакет
4. **Обновление ссылок** - замена содержимого в основном `docs/requirements/` на ссылку на пакет
5. **Синхронизация tracker файлов** - обновление tracker файлов с указанием нового расположения требований

### Этап 6: Финализация

1. **Проверка чеклистов** - выполнение всех чеклистов синхронизации
2. **Обновление статистики** - фиксация статистики в tracker файлах
3. **Обновление дат** - указание даты последнего обновления
4. **Проверка требований в пакетах** - верификация актуальности требований в `packages/*/docs/requirements/`
5. **Отчет** - создание отчета о выполненной синхронизации

---

## 📋 Примеры использования

### Пример 1: Добавление нового контроллера админки

**Последовательность:**
1. **Требования** - добавить описание в `admin/requirements-admin-platform.md` или `admin/requirements-admin-api.md`
2. **Tracker** - добавить в `requirements-status-tracker-admin.md` как ❌ ОТСУТСТВУЕТ
3. **Testing** - добавить требования к тестам в `testing/requirements-testing-blueprint.md` и `testing/requirements-testing-admin.md`
4. **Вопросы** - обновить вопросы в `.carior/questions/to-user/admin`

**После реализации:**
1. **Tracker** - отметить как ✅ РЕАЛИЗОВАНО в `requirements-status-tracker-admin.md`
2. **Требования** - переместить из "Будущие" в "Существующие" в соответствующем файле
3. **Testing** - обновить статус тестов в `testing/requirements-testing-admin.md`

### Пример 2: Перелив данных между файлами

**Ситуация:** В `admin/requirements-admin-platform.md` найдены описания тестов

**Последовательность:**
1. **Определить правильное место** - тесты → `testing/requirements-testing-blueprint.md` или `testing/requirements-testing-admin.md`
2. **Переместить информацию** - перенести описания тестов в соответствующий testing файл
3. **Заменить на ссылку** - в `admin/requirements-admin-platform.md` оставить ссылку
4. **Обновить tracker** - обновить `requirements-status-tracker-testing.md`

### Пример 3: Отслеживание захардкоженных мест

**Ситуация:** Обнаружен захардкоженный список меню в коде

**Последовательность:**
1. **Зафиксировать в core-foundation** - добавить в `core/requirements-core-foundation.md` (раздел "Захардкоженные места")
2. **Обновить tracker** - добавить задачу в `requirements-status-tracker-core.md`
3. **Обновить testing** - добавить тест в `testing/requirements-testing-blueprint.md` или `testing/requirements-testing-core.md`

### Пример 4: Миграция требований в пакет

**Ситуация:** Код каталога мигрирует в пакет `commerce-catalog`, нужно мигрировать требования

**Последовательность:**

#### Шаг 1: Определение документов для миграции
1. **Проверить gap-файл** - открыть `docs/requirements/gap-package-migration-catalog-services-models.md`
2. **Найти секцию "Миграция документов требований"** - проверить список документов:
   - ✅ `docs/requirements/commerce/requirements-commerce-catalog.md`
   - ✅ `docs/requirements/commerce/requirements-admin-commerce.md`
   - ✅ `docs/requirements/testing/requirements-testing-catalog.md`
3. **Проверить зависимости** - убедиться, что все связанные документы учтены

#### Шаг 2: Создание структуры требований в пакете
1. **Создать директорию** - `packages/hybrid/commerce-catalog/docs/requirements/`
2. **Создать README.md** - описание структуры требований пакета:
   ```markdown
   # Требования пакета commerce-catalog
   
   Этот пакет содержит требования к функциональности e-commerce каталога.
   
   ## Структура требований
   - `requirements-commerce-catalog.md` - основные требования к каталогу
   - `requirements-admin-commerce.md` - требования к админ-каталогу
   - `requirements-testing-catalog.md` - тестовые требования
   ```
3. **Подготовить шаблоны** - создать пустые файлы для миграции

#### Шаг 3: Миграция документов
1. **Скопировать содержимое** - перенести соответствующие разделы из `docs/requirements/commerce/requirements-commerce-catalog.md` в `packages/hybrid/commerce-catalog/docs/requirements/requirements-commerce-catalog.md`
2. **Адаптировать пути** - обновить все ссылки на файлы кода (теперь они в пакете)
3. **Обновить структуру** - привести к формату требований пакета (убрать ссылки на другие модули, оставить только относящиеся к каталогу)
4. **Повторить для всех документов** - мигрировать `requirements-admin-commerce.md` и `requirements-testing-catalog.md`

#### Шаг 4: Обновление ссылок в основном docs/requirements/
1. **Заменить содержимое** - в `docs/requirements/commerce/requirements-commerce-catalog.md` оставить:
   ```markdown
   # Требования к Commerce Catalog
   
   **⚠️ Требования мигрированы в пакет**
   
   Основные требования находятся в пакете: [`packages/hybrid/commerce-catalog/docs/requirements/requirements-commerce-catalog.md`](../../../packages/hybrid/commerce-catalog/docs/requirements/requirements-commerce-catalog.md)
   
   ## Краткая сводка
   [Краткое описание функциональности для быстрого понимания]
   
   ## Связанные документы
   - [Требования к админ-каталогу](../../../packages/hybrid/commerce-catalog/docs/requirements/requirements-admin-commerce.md)
   - [Тестовые требования](../../../packages/hybrid/commerce-catalog/docs/requirements/requirements-testing-catalog.md)
   ```
2. **Обновить cross-references** - во всех других файлах требований заменить ссылки на новые пути
3. **Обновить tracker файлы** - указать новое расположение требований

#### Шаг 5: Синхронизация tracker файлов
1. **Обновить requirements-status-tracker-catalog.md**:
   ```markdown
   ## Расположение требований
   - Основные требования: `packages/hybrid/commerce-catalog/docs/requirements/requirements-commerce-catalog.md`
   - Админ требования: `packages/hybrid/commerce-catalog/docs/requirements/requirements-admin-commerce.md`
   - Тестовые требования: `packages/hybrid/commerce-catalog/docs/requirements/requirements-testing-catalog.md`
   ```
2. **Обновить requirements-status-tracker-packages.md** - добавить информацию о требованиях в пакете
3. **Обновить общий tracker** - `requirements-status-tracker.md`

#### Шаг 6: Обновление gap-файла
1. **Отметить выполненное** - в `gap-package-migration-catalog-services-models.md` обновить статус:
   ```markdown
   #### Миграция документов требований
   
   **Статус:** ✅ ЗАВЕРШЕНО
   
   **Мигрированные документы:**
   - ✅ `docs/requirements/commerce/requirements-commerce-catalog.md` → `packages/hybrid/commerce-catalog/docs/requirements/requirements-commerce-catalog.md`
   - ✅ `docs/requirements/commerce/requirements-admin-commerce.md` → `packages/hybrid/commerce-catalog/docs/requirements/requirements-admin-commerce.md`
   - ✅ `docs/requirements/testing/requirements-testing-catalog.md` → `packages/hybrid/commerce-catalog/docs/requirements/requirements-testing-catalog.md`
   ```

### Пример 5: Синхронизация требований между пакетом и основным docs/requirements/

**Ситуация:** В пакете `commerce-catalog` обновлены требования, нужно синхронизировать с основным `docs/requirements/`

**Последовательность:**
1. **Проверить изменения** - проанализировать изменения в `packages/hybrid/commerce-catalog/docs/requirements/`
2. **Обновить ссылки** - если изменилась структура, обновить ссылки в основном `docs/requirements/commerce/requirements-commerce-catalog.md`
3. **Обновить tracker** - обновить статусы в `requirements-status-tracker-catalog.md`
4. **Проверить cross-references** - убедиться, что все ссылки на требования пакета актуальны

---

## ⚙️ Конфигурация

### Структура каталогов требований

```
docs/requirements/
├── core/                  # Core Foundation
│   ├── requirements-core-foundation.md
│   ├── requirements-core-architecture.md
│   ├── requirements-core-base-classes.md
│   ├── requirements-core-services.md
│   ├── requirements-core-api.md
│   └── requirements-core-configuration.md
├── admin/                 # Admin Platform
│   ├── requirements-admin-platform.md
│   ├── requirements-admin-api.md
│   ├── requirements-admin-content.md
│   ├── requirements-admin-localization.md
│   ├── requirements-admin-menu.md
│   └── requirements-admin-security.md
├── commerce/              # Commerce и Pages модули
│   ├── requirements-admin-commerce.md
│   ├── requirements-pages-module.md
│   ├── requirements-commerce-catalog.md
│   └── pages-layout-blueprints.md
├── testing/               # Требования к тестированию
│   ├── requirements-testing-blueprint.md
│   ├── requirements-testing-strategy.md
│   ├── requirements-testing-infrastructure.md
│   ├── requirements-testing-core.md
│   ├── requirements-testing-admin.md
│   ├── requirements-testing-catalog.md
│   └── requirements-testing-pages.md
├── packages/              # Package blueprints
│   ├── core/
│   ├── platform/
│   ├── ui/
│   ├── components/
│   └── services/
├── features/              # Standalone features
│   ├── requirements-deploy-project.md
│   ├── requirements-analytics-export.md
│   ├── requirements-env-guard.md
│   ├── requirements-ssl-setup.md
│   └── requirements-admin-routes-monitor.md
├── operations/            # Операционные документы
│   ├── requirements-npm-packages.md
│   ├── requirements-composer-packages.md
│   ├── requirements-migration-playbook.md
│   ├── requirements-refresh-roadmap.md
│   └── requirements-services-carior-integration.md
├── requirements-status-tracker.md          # Общий tracker
├── requirements-status-tracker-core.md     # Tracker Core
├── requirements-status-tracker-admin.md    # Tracker Admin
├── requirements-status-tracker-catalog.md # Tracker Catalog
├── requirements-status-tracker-pages.md    # Tracker Pages
├── requirements-status-tracker-testing.md  # Tracker Testing
├── requirements-status-tracker-packages.md # Tracker Packages
├── requirements-structure.md               # Структура требований
├── README.md                               # Описание структуры
└── projects-context-summary.md             # Контекст проекта
```

### Структура Status Tracker файлов

| Tracker файл | Назначение | Связанные requirements файлы |
| --- | --- | --- |
| `requirements-status-tracker-core.md` | Статус Core Foundation | `requirements-core-foundation.md`, `requirements-core-architecture.md`, `requirements-core-base-classes.md`, `requirements-core-services.md`, `requirements-core-api.md`, `requirements-core-configuration.md` |
| `requirements-status-tracker-admin.md` | Статус Admin Platform | `requirements-admin-platform.md`, `requirements-admin-commerce.md` |
| `requirements-status-tracker-pages.md` | Статус Pages Module | `requirements-pages-module.md` |
| `requirements-status-tracker-catalog.md` | Статус Commerce Catalog | `requirements-commerce-catalog.md` |
| `requirements-status-tracker-testing.md` | Статус тестирования | `requirements-testing-blueprint.md` |
| `requirements-status-tracker-packages.md` | Статус пакетов | Все файлы в `docs/requirements/packages/` |

### Матрица синхронизации

| Изменённый файл | Обязательные обновления |
| --- | --- |
| `core/requirements-core-foundation.md` | `requirements-status-tracker-core.md`, `testing/requirements-testing-blueprint.md`, `testing/requirements-testing-core.md`, все файлы, использующие базовые классы/API |
| `core/requirements-core-architecture.md` | `requirements-status-tracker-core.md` |
| `core/requirements-core-base-classes.md` | `requirements-status-tracker-core.md`, все файлы, использующие базовые классы (`core/requirements-admin-platform.md`, `commerce/requirements-commerce-catalog.md`, `commerce/requirements-pages-module.md`) |
| `core/requirements-core-services.md` | `requirements-status-tracker-core.md` |
| `core/requirements-core-api.md` | `requirements-status-tracker-core.md` |
| `core/requirements-core-configuration.md` | `requirements-status-tracker-core.md` |
| `admin/requirements-admin-platform.md` | `requirements-status-tracker-admin.md`, `testing/requirements-testing-blueprint.md`, `testing/requirements-testing-admin.md`, `commerce/requirements-admin-commerce.md` (если задето управление товарами), вопросы `admin/*`, `pages-admin/*` |
| `admin/requirements-admin-api.md` | `requirements-status-tracker-admin.md`, `testing/requirements-testing-admin.md` |
| `admin/requirements-admin-content.md` | `requirements-status-tracker-admin.md`, `testing/requirements-testing-admin.md`, `commerce/requirements-pages-module.md` (если управление контентом страниц) |
| `admin/requirements-admin-localization.md` | `requirements-status-tracker-admin.md`, `testing/requirements-testing-admin.md` |
| `admin/requirements-admin-menu.md` | `requirements-status-tracker-admin.md`, `testing/requirements-testing-admin.md` |
| `admin/requirements-admin-security.md` | `requirements-status-tracker-admin.md`, `testing/requirements-testing-admin.md` |
| `commerce/requirements-admin-commerce.md` | `requirements-status-tracker-admin.md`, `commerce/requirements-commerce-catalog.md`, `testing/requirements-testing-blueprint.md`, `testing/requirements-testing-catalog.md`, вопросы `catalog-admin/*` |
| `commerce/requirements-pages-module.md` | `requirements-status-tracker-pages.md`, `testing/requirements-testing-blueprint.md`, `testing/requirements-testing-pages.md`, `admin/requirements-admin-platform.md` или `admin/requirements-admin-content.md` (если управление контентом), вопросы `pages/*` |
| `commerce/requirements-commerce-catalog.md` | `requirements-status-tracker-catalog.md`, `testing/requirements-testing-blueprint.md`, `testing/requirements-testing-catalog.md`, `admin/requirements-admin-platform.md` (если есть управление через админку), вопросы `catalog/*` |
| `testing/requirements-testing-blueprint.md` | `requirements-status-tracker-testing.md` (обновить статус тестов) |
| `testing/requirements-testing-*.md` | `requirements-status-tracker-testing.md` (обновить статус соответствующих тестов) |
| `requirements-status-tracker-*.md` | Верифицировать соответствие всех ссылок на источники, обновить общий tracker (`requirements-status-tracker.md`) |
| Любой файл из `packages/` | `requirements-status-tracker-packages.md`, соответствующий основной файл |
| Любой файл из `features/` | Соответствующий tracker файл, связанный набор вопросов |

---

## ⚠️ Важные замечания

### Правила синхронизации

1. **НЕ допускать дублирования** - каждое требование только в одном файле
2. **ВСЕГДА обновлять связанные файлы** - при изменении одного файла обновить все связанные
3. **ВСЕГДА проверять границы ответственности** - информация должна быть в правильном файле
4. **ВСЕГДА переливать данные** - если информация не на своем месте, переместить в правильный файл
5. **ВСЕГДА синхронизировать при опережении** - если один документ впереди, подогнать остальные
6. **ВСЕГДА отслеживать хардкод** - захардкоженные места фиксировать в `requirements-core-foundation.md`
7. **НЕТ ПОНЯТИЯ "ОПЦИОНАЛЬНО"** - компонент либо ✅ РЕАЛИЗОВАНО, либо ❌ ОТСУТСТВУЕТ
8. **ВСЕГДА мигрировать требования вместе с кодом** - при миграции кода в пакет мигрировать соответствующие требования
9. **ВСЕГДА синхронизировать требования в пакетах** - требования в пакетах должны быть актуальными и синхронизированными с основным `docs/requirements/`
10. **ВСЕГДА использовать стандарт gap-файлов** - при создании gap-файлов миграции использовать стандарт из `.carior/roles/requirements-sync/gap-files-format-standard.md`

### Распространенные ошибки

- **Дублирование информации** - приводит к рассинхронизации и путанице
- **Игнорирование связанных файлов** - изменения не отражаются во всех нужных местах
- **Неправильное место хранения** - информация в неподходящем файле
- **Использование "опционально"** - недопустимо, только четкий статус ✅/❌
- **Игнорирование tracker файлов** - статусы не обновляются при изменениях
- **Игнорирование миграции требований** - при миграции кода в пакет не мигрируются требования
- **Отсутствие синхронизации требований в пакетах** - требования в пакетах не обновляются при изменениях
- **Неправильная структура требований в пакетах** - отсутствие минимального набора требований или README.md

### Лучшие практики

- **Работать последовательно** - один файл → обновление связанных → следующий файл
- **Фиксировать прогресс** - отмечать выполненные этапы в `.carior/tasks/{phase-id}/`
- **Использовать чеклисты** - для отслеживания состояния синхронизации
- **Документировать решения** - особенно при сложных переливах данных
- **Проверять матрицу синхронизации** - перед обновлением проверить все связанные файлы
- **Мигрировать требования вместе с кодом** - при миграции кода в пакет сразу мигрировать требования
- **Использовать стандарт gap-файлов** - всегда использовать стандарт из `.carior/roles/requirements-sync/gap-files-format-standard.md`
- **Проверять требования в пакетах** - регулярно проверять актуальность требований в `packages/*/docs/requirements/`
- **Обновлять ссылки** - при миграции требований обновлять все ссылки в основном `docs/requirements/`

---

## ✅ Чеклисты синхронизации

### Перед внесением изменений

#### Определение целевого файла
- [ ] Определён целевой файл по карте ответственности:
  - Core Foundation → `docs/requirements/core/requirements-core-foundation.md`
  - Terminal → `docs/requirements/terminal/requirements-terminal.md`
  - Security → `docs/requirements/security/requirements-security.md`
  - Testing → `docs/requirements/testing/requirements-testing.md`
  - Operations → `docs/requirements/operations/requirements-operations.md`
  - Features → `docs/requirements/features/requirements-features.md`
- [ ] Проверены границы ответственности файла (что внутри, что вне)
- [ ] Проверено, что информация не относится к другому файлу

#### Проверка связанных файлов
- [ ] Проверена матрица синхронизации для определения всех связанных файлов
- [ ] Для Core Foundation проверены:
  - `docs/requirements/requirements-status-tracker.md`
  - `docs/requirements/testing/requirements-testing.md`
  - Все файлы, использующие базовые классы (если изменены базовые классы)
- [ ] Для Terminal проверены:
  - `docs/requirements/requirements-status-tracker.md`
  - `docs/requirements/testing/requirements-testing.md`
  - `docs/requirements/security/requirements-security.md` (безопасность выполнения команд)
- [ ] Для Security проверены:
  - `docs/requirements/requirements-status-tracker.md`
  - `docs/requirements/testing/requirements-testing.md`
  - `docs/requirements/terminal/requirements-terminal.md` (безопасное выполнение команд)
- [ ] Для Testing проверены:
  - `docs/requirements/requirements-status-tracker.md`
  - Соответствующий основной файл требований
- [ ] Для Operations проверены:
  - `docs/requirements/requirements-status-tracker.md`
  - `docs/requirements/core/requirements-core-foundation.md` (конфигурация)
- [ ] Для Features проверены:
  - `docs/requirements/requirements-status-tracker.md`
  - `docs/requirements/testing/requirements-testing.md`
  - `docs/requirements/terminal/requirements-terminal.md` (история команд)

#### Проверка на дублирование
- [ ] Выполнен поиск по всем `docs/requirements/**/*.md` на наличие дублирующей информации
- [ ] Проверено, что компонент не описан в нескольких файлах одновременно
- [ ] Проверено, что тесты не описаны в файлах требований (только в `requirements-testing-blueprint.md`)
- [ ] Проверено, что захардкоженные места не описаны в других файлах (только в `requirements-core-foundation.md`)

#### Подготовка плана
- [ ] Подготовлен план перелива данных (если информация не на своем месте):
  - Определен исходный файл
  - Определен целевой файл
  - Определены все связанные файлы для обновления
- [ ] Подготовлен план синхронизации (если один документ впереди):
  - Определен опережающий документ
  - Определены отстающие документы
  - Подготовлен список изменений для каждого документа

### После обновления основного файла

#### Обновление tracker файлов
- [ ] Обновлён соответствующий специализированный tracker файл:
  - Core Foundation → `docs/requirements/requirements-status-tracker-core.md`
  - Admin Platform → `docs/requirements/requirements-status-tracker-admin.md`
  - Pages Module → `docs/requirements/requirements-status-tracker-pages.md`
  - Commerce Catalog → `docs/requirements/requirements-status-tracker-catalog.md`
  - Testing → `docs/requirements/requirements-status-tracker-testing.md`
  - Packages → `docs/requirements/requirements-status-tracker-packages.md`
- [ ] В tracker файле обновлено:
  - Статус компонента (✅ РЕАЛИЗОВАНО или ❌ ОТСУТСТВУЕТ)
  - Статистика реализации (количество компонентов, процент готовности)
  - Дата последнего обновления
  - Ссылка на источник требования
- [ ] Если изменён общий tracker (`requirements-status-tracker.md`) → обновлена сводная статистика:
  - Общий прогресс по всем модулям
  - Ссылки на специализированные tracker файлы
  - Дата последней синхронизации

#### Обновление testing blueprint
- [ ] Обновлён `docs/requirements/testing/requirements-testing-blueprint.md`:
  - Добавлены требования к тестам для нового компонента (если добавлен)
  - Указан тип тестов (Unit/Feature/E2E/Playwright)
  - Указан батч для тестов (если применимо)
  - Обновлен статус тестов (✅ реализовано / ❌ требуется реализация)
- [ ] Обновлён соответствующий специализированный testing файл (если применимо):
  - Core → `docs/requirements/testing/requirements-testing-core.md`
  - Admin → `docs/requirements/testing/requirements-testing-admin.md`
  - Catalog → `docs/requirements/testing/requirements-testing-catalog.md`
  - Pages → `docs/requirements/testing/requirements-testing-pages.md`
- [ ] Обновлён `docs/requirements/requirements-status-tracker-testing.md` (статус реализации тестов)

#### Обновление списков файлов
- [ ] В целевом `requirements-*.md` обновлены разделы:
  - `### ✅ Существующие файлы (РЕАЛИЗОВАНО)` - добавлен новый файл (если реализован)
  - `### ❌ Будущие файлы (ОТСУТСТВУЕТ / планируется)` - добавлен новый файл (если запланирован)
  - Файл перемещен из "Будущие" в "Существующие" (если реализован)
- [ ] Проверено, что файл указан только в одном месте (либо в "Существующих", либо в "Будущих")
- [ ] Проверено, что все файлы из кода присутствуют в списках

#### Миграция требований в пакеты (если применимо)
- [ ] Проверен gap-файл миграции (`gap-package-migration-*.md`):
  - Найдена секция "Миграция документов требований"
  - Проверен список документов для миграции
  - Проверены зависимости между документами
- [ ] Определены документы требований для миграции в пакет:
  - Основные требования (`requirements-{module}.md`)
  - Тестовые требования (`requirements-testing-{module}.md`)
  - Админ требования (`requirements-admin-{module}.md`, если применимо)
  - Фронтенд требования (`requirements-frontend-{module}.md`, если применимо)
- [ ] Создана структура `packages/{type}/{package-name}/docs/requirements/`:
  - Создана директория `docs/requirements/` в пакете
  - Создан `README.md` с описанием структуры требований пакета
  - Созданы шаблоны для всех документов требований
- [ ] Мигрированы документы из `docs/requirements/`:
  - Скопировано содержимое соответствующих разделов
  - Адаптированы пути к файлам кода (теперь в пакете)
  - Обновлена структура (убраны ссылки на другие модули)
  - Проверена корректность всех ссылок внутри пакета
- [ ] Обновлены ссылки в основном `docs/requirements/`:
  - Заменено содержимое на ссылку на требования в пакете
  - Добавлена краткая сводка для быстрого понимания
  - Обновлены все cross-references в других файлах
- [ ] Обновлены gap-файлы миграции:
  - Добавлена секция "Миграция документов требований" (если отсутствует)
  - Указаны все документы для миграции в пакет
  - Отмечен статус миграции (✅ ЗАВЕРШЕНО / ⏳ В ПРОЦЕССЕ)
- [ ] Синхронизированы tracker файлы:
  - Обновлены ссылки на требования в пакетах
  - Указано новое расположение требований
  - Обновлен `requirements-status-tracker-packages.md`
- [ ] Проверена синхронизация:
  - Все ссылки работают корректно
  - Нет дублирования требований
  - Структура требований в пакете соответствует стандарту

#### Обновление связанных файлов по матрице синхронизации
- [ ] Для `core/requirements-core-foundation.md` обновлены:
  - `requirements-status-tracker.md`
  - `testing/requirements-testing.md`
  - Все файлы, использующие базовые классы (если изменены базовые классы)
- [ ] Для `terminal/requirements-terminal.md` обновлены:
  - `requirements-status-tracker.md`
  - `testing/requirements-testing.md`
  - `security/requirements-security.md` (безопасность выполнения команд)
- [ ] Для `security/requirements-security.md` обновлены:
  - `requirements-status-tracker.md`
  - `testing/requirements-testing.md`
  - `terminal/requirements-terminal.md` (безопасное выполнение команд)
- [ ] Для `testing/requirements-testing.md` обновлён:
  - `requirements-status-tracker.md`
  - Соответствующий основной файл требований
- [ ] Для `operations/requirements-operations.md` обновлены:
  - `requirements-status-tracker.md`
  - `core/requirements-core-foundation.md` (конфигурация)
- [ ] Для `features/requirements-features.md` обновлены:
  - `requirements-status-tracker.md`
  - `testing/requirements-testing.md`
  - `terminal/requirements-terminal.md` (история команд)

#### Работа с архивными файлами
- [ ] Проверены архивные файлы `project-requirements-*.md`:
  - Если найдены живые данные → перенесены в актуальный `requirements-*.md`
  - Содержимое заменено на stub-ссылку: `# Источник перенесён в [актуальный файл](path/to/file.md)`
- [ ] Проверены файлы в `docs/requirements/admin/`, `docs/requirements/client/`, `docs/requirements/standalone-features/`:
  - Если файл интегрирован → оставлен stub с ссылкой на основной документ
  - Если файл устарел → удален
  - Если создан новый файл → указан владелец и ссылка на основной документ

#### Обновление вопросов пользователю
- [ ] Обновлены вопросы в `.carior/questions/to-user/`:
  - `admin/*` и `pages-admin/*` → для изменений в `requirements-admin-platform.md` и `requirements-pages-module.md`
  - `catalog/*` и `catalog-admin/*` → для изменений в `requirements-commerce-catalog.md` и `requirements-admin-commerce.md`
  - `pages/*` → для изменений в `requirements-pages-module.md`
  - `project/*` и `ruba/*` → для изменений в `requirements-core-foundation.md` и `requirements-status-tracker.md`
  - `testing/*` → для изменений в `requirements-testing-blueprint.md`
  - `deployment/*` → для изменений в `features/requirements-deploy-project.md`
- [ ] Если ответов нет → добавлен placeholder вопрос со статусом ❌
- [ ] Добавлена ссылка «Источник требований: [файл](path/to/file.md)» в каждом наборе вопросов

#### Обновление захардкоженных мест
- [ ] Если обнаружен хардкод → добавлен в `core/requirements-core-foundation.md` (раздел "Захардкоженные места"):
  - Указано местонахождение (путь к файлу)
  - Описано, что захардкожено
  - Описано, что должно быть (динамическое значение, конфигурация, БД)
  - Указан приоритет (P0/P1/P2)
- [ ] Обновлён `requirements-status-tracker-core.md` (добавлена задача по устранению хардкода)
- [ ] Обновлён `testing/requirements-testing-blueprint.md` или соответствующий специализированный testing файл (добавлен тест для проверки динамического значения)

### Контроль дублей и качества

#### Проверка отсутствия "опционально"
- [ ] Выполнен поиск по всем `docs/requirements/**/*.md` на наличие:
  - Слова "опционально"
  - Слова "optional"
  - Слова "опциональный"
  - Фразы "может быть"
  - Фразы "может отсутствовать"
- [ ] Все найденные упоминания заменены на четкий статус:
  - ✅ РЕАЛИЗОВАНО - если компонент существует
  - ❌ ОТСУТСТВУЕТ - если компонент отсутствует и требуется
  - Удалено из требований - если компонент не требуется

#### Проверка списков файлов
- [ ] Проверено, что каждый файл указан только в одном месте:
  - Либо в разделе `### ✅ Существующие файлы (РЕАЛИЗОВАНО)`
  - Либо в разделе `### ❌ Будущие файлы (ОТСУТСТВУЕТ / планируется)`
- [ ] Проверено, что нет файлов одновременно в обоих разделах
- [ ] Проверено, что все файлы из кода присутствуют в списках соответствующих `requirements-*.md`
- [ ] Проверено, что файлы не дублируются между разными `requirements-*.md` (только ссылки)

#### Проверка ссылок
- [ ] Все ссылки на другие файлы оформлены как Markdown-ссылки:
  - Формат: `[Описание](path/to/file.md#section)`
  - С конкретным якорем (если ссылается на раздел)
  - С относительным путем от текущего файла
- [ ] Проверена работоспособность всех ссылок:
  - Файлы существуют
  - Якоря корректны
  - Пути правильные
- [ ] Проверено, что вместо дублирования используются ссылки

#### Проверка границ ответственности
- [ ] Тесты описаны только в `testing/requirements-testing-*.md`:
  - Нет описаний тестов в `admin/requirements-admin-platform.md`
  - Нет описаний тестов в `commerce/requirements-commerce-catalog.md`
  - Нет описаний тестов в `commerce/requirements-pages-module.md`
  - Нет описаний тестов в `core/requirements-core-foundation.md`
- [ ] Админ-функционал описан только в `admin/requirements-admin-*.md`:
  - Основная платформа → `admin/requirements-admin-platform.md`
  - API → `admin/requirements-admin-api.md`
  - Контент → `admin/requirements-admin-content.md`
  - Локализация → `admin/requirements-admin-localization.md`
  - Меню → `admin/requirements-admin-menu.md`
  - Безопасность → `admin/requirements-admin-security.md`
  - Нет описаний админ-контроллеров в других файлах
  - Нет описаний админ-UI в других файлах
- [ ] Каталог описан только в `commerce/requirements-commerce-catalog.md`:
  - Нет описаний компонентов каталога в `core/requirements-core-foundation.md`
  - Нет описаний UI каталога в других файлах
- [ ] Модуль страниц описан только в `commerce/requirements-pages-module.md`:
  - Нет описаний секций страниц в других файлах
- [ ] Core Foundation описан только в соответствующих файлах:
  - Главный файл → `core/requirements-core-foundation.md`
  - Архитектура → `core/requirements-core-architecture.md`
  - Базовые классы → `core/requirements-core-base-classes.md`
  - Сервисы → `core/requirements-core-services.md`
  - API → `core/requirements-core-api.md`
  - Конфигурации → `core/requirements-core-configuration.md`
  - Захардкоженные места → `core/requirements-core-foundation.md`

#### Финальная проверка синхронизации
- [ ] Все связанные файлы обновлены согласно матрице синхронизации
- [ ] Статусы в tracker файлах соответствуют реальному состоянию кода
- [ ] Статистика в tracker файлах актуальна
- [ ] Даты последнего обновления указаны во всех измененных файлах
- [ ] Нет расхождений между требованиями и реальным кодом
- [ ] Все gap файлы проверены на актуальность (минимум раз за спринт)
- [ ] Требования в пакетах синхронизированы с основным `docs/requirements/`:
  - Все изменения в пакетах отражены в основном `docs/requirements/`
  - Все ссылки на требования в пакетах актуальны
  - Нет дублирования требований между пакетами и основным `docs/requirements/`
- [ ] Все пакеты содержат актуальные требования в `packages/*/docs/requirements/`:
  - Каждый пакет имеет минимальный набор требований (requirements-{module}.md, requirements-testing-{module}.md)
  - Структура требований в пакетах соответствует стандарту
  - README.md в каждом пакете описывает структуру требований
- [ ] Ссылки на требования в пакетах работают корректно:
  - Все относительные пути корректны
  - Все якоря работают
  - Нет битых ссылок

---

## 🧹 Контроль временных документов (Gap файлы)

**Gap файлы** — временные документы для фиксации проблем, долгов, идей по рефакторингу, которые неудобно хранить в основных requirements файлах.

**Расположение:** `docs/requirements/gap-*.md` (в корне `docs/requirements/`)

**Правила:**
- Любой файл в `docs/requirements`, в названии которого **есть префикс `gap-`**, считается временным gap-файлом
- Gap файлы используются для:
  - Идей по рефакторингу
  - Debt-листов
  - Черновиков миграций
  - Проблем интеграции между модулями
  - Временных технических долгов
- **НЕ используются для:**
  - Основных требований (должны быть в `requirements-*.md`)
  - Статуса реализации (должен быть в `requirements-status-tracker-*.md`)
  - Тестовых требований (должны быть в `requirements-testing-blueprint.md`)

**Жизненный цикл:**
1. Создание gap-файла с владельцем и планом интеграции
2. Регистрация в соответствующей задаче `.carior/tasks`
3. Минимум раз за спринт: содержимое переносится в задачи и профильные requirements
4. После интеграции: gap-файл удаляется или помечается как закрытый

**Важно:** Gap файлы не могут быть источником истины. Если они становятся постоянными, их переименовывают в `requirements-*.md` и добавляют в карту ответственности.

**Миграция требований в gap-файлах:**
- Gap-файлы миграции (`gap-package-migration-*.md`) должны содержать секцию "Миграция документов требований"
- Указывать все документы требований, которые мигрируют вместе с кодом в пакет
- После миграции обновить gap-файл с указанием нового расположения требований
- Использовать стандарт из `.carior/roles/requirements-sync/gap-files-format-standard.md` для оформления секции миграции требований

**Структура требований в пакетах:**
- Каждый пакет должен содержать минимальный набор требований в `packages/{type}/{package-name}/docs/requirements/`:
  - `README.md` - описание структуры требований пакета (обязательно)
  - `requirements-{module}.md` - основные требования к функциональности пакета (обязательно)
  - `requirements-testing-{module}.md` - тестовые требования (если есть тесты)
  - `requirements-admin-{module}.md` - требования к админке (если применимо)
  - `requirements-frontend-{module}.md` - требования к фронтенду (если применимо)
  - `requirements-core-{module}.md` - базовые требования (если требуется)
- После миграции в основном `docs/requirements/` остается ссылка на требования в пакете с краткой сводкой
- Все cross-references обновляются для указания на требования в пакете

---

## 🔗 Связь с вопросами пользователю

| Каталог вопросов | Основные файлы |
| --- | --- |
| `.carior/questions/to-user/admin`, `pages-admin` | `admin/requirements-admin-platform.md`, `commerce/requirements-pages-module.md` |
| `.carior/questions/to-user/catalog`, `catalog-admin` | `commerce/requirements-commerce-catalog.md`, `commerce/requirements-admin-commerce.md` |
| `.carior/questions/to-user/pages` | `commerce/requirements-pages-module.md` |
| `.carior/questions/to-user/project`, `ruba` | `core/requirements-core-foundation.md`, `requirements-status-tracker.md` |
| `.carior/questions/to-user/testing` | `testing/requirements-testing-blueprint.md` |
| `.carior/questions/to-user/deployment` | `features/requirements-deploy-project.md` |

Правило: любое изменение файлов требований должно сопровождаться проверкой соответствующих вопросов/ответов. Если ответов нет — добавить placeholder вопрос со статусом ❌.

---

## 📚 Дополнительная информация

### Связь с другими комплексными ролями

Requirements Sync Coordinator может работать совместно с:
- **Development Workflow Coordinator** - для обновления требований при реализации компонентов
- **Testing Engineer** - для синхронизации тестовых требований
- **Documentation Specialist** - для обновления документации на основе требований
- **Code Analyst** - для выявления захардкоженных мест в коде

### Масштабирование

Роль может быть адаптирована для:
- **Командной работы** - координация между разработчиками разных модулей
- **Крупных проектов** - работа с множеством файлов требований и зависимостей
- **Мультипроектных решений** - координация требований в нескольких проектах

### Интеграция с системой задач

Роль использует систему задач для:
- **Фиксации синхронизации** - логирование операций в `.carior/tasks/05-development/*`
- **Отслеживания прогресса** - обновление статусов в задачах
- **Документирования решений** - фиксация причин переливов данных

---

**Дата создания:** 2025-11-27
**Последнее обновление:** 2025-11-29 (адаптирована для MCP Terminal Server)
**Версия:** 2.3.0
**Статус:** Активная
**Категория:** Complex
**Проект:** MCP Terminal Server (@mcp/terminal-server, Node.js + TypeScript + MCP Protocol)

## 📚 Дополнительные ресурсы

- **Стандарт gap-файлов:** `.carior/roles/requirements-sync/gap-files-format-standard.md` - стандарт оформления gap-файлов миграции, включая секцию "Миграция документов требований"
- **Примеры миграции:** `docs/requirements/gap-package-migration-catalog-services-models.md` - пример gap-файла с миграцией требований
- **README роли:** `.carior/roles/requirements-sync/README.md` - описание структуры роли и работы с партиалами
- **Партиалы:** `.carior/roles/requirements-sync/partials/` - узкие границы ответственности по модулям (в процессе обновления)

## 📦 Партиалы (узкие границы ответственности)

**Статус:** Партиалы находятся в процессе обновления под новую структуру требований.

Партиалы содержат узкие границы ответственности для синхронизации требований по модулям проекта:
- `partials/admin-requirements.md` - только требования к админ-панели
- `partials/catalog-requirements.md` - только требования к e-commerce каталогу
- `partials/landing-requirements.md` - только требования к публичному лендингу
- `partials/core-requirements.md` - только общие требования (структура, базовые классы, API)
- `partials/test-requirements.md` - только требования к тестированию
- `partials/missed-requirements.md` - только статус реализации требований
- `partials/frontend-requirements.md` - только требования к фронтенду
- `partials/backend-requirements.md` - только требования к бэкенду

**Важно:** До обновления партиалов использовать основную роль `requirements-sync.md` для синхронизации требований, которая содержит актуальную информацию о структуре требований и миграции в пакеты.

**Планируемые обновления партиалов:**
1. Обновление ссылок на актуальную структуру требований
2. Добавление поддержки миграции требований в пакеты
3. Синхронизация с новой структурой `docs/requirements/`
