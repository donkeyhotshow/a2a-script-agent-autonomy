# Requirements Sync Role

Роль для синхронизации и балансировки данных между документами требований проекта, включая миграцию требований в пакеты.

## 📁 Структура

```
requirements-sync/
├── requirements-sync.md          # Основная роль (координатор)
├── gap-files-format-standard.md  # Стандарт оформления gap-файлов миграции
├── partials/                     # Партиалы с узкими границами ответственности
│   ├── admin-requirements.md    # Только требования к админке
│   ├── catalog-requirements.md  # Только требования к каталогу
│   ├── landing-requirements.md  # Только требования к лендингу
│   ├── core-requirements.md     # Только общие требования
│   ├── test-requirements.md    # Только требования к тестам
│   ├── missed-requirements.md   # Только невыполненные требования
│   ├── frontend-requirements.md # Только требования к фронтенду
│   └── backend-requirements.md  # Только требования к бэкенду
└── README.md                     # Этот файл
```

## 🎯 Принцип работы

### Разделение ответственности

Каждый партиал отвечает **только за свою область**:

- **admin-requirements.md** - только требования к админ-панели
- **catalog-requirements.md** - только требования к e-commerce каталогу
- **landing-requirements.md** - только требования к публичному лендингу
- **core-requirements.md** - только общие требования (структура, базовые классы, API)
- **test-requirements.md** - только требования к тестированию
- **missed-requirements.md** - только статус реализации требований

### Синхронизация

Основная роль `requirements-sync.md`:
- Отслеживает изменения в партиалах
- Обновляет связанные партиалы
- Предотвращает дублирование
- Поддерживает актуальность всех документов

## 🔗 Связь с основными документами

Партиалы синхронизируются с основными документами проекта:

**Core Foundation:**
- `docs/requirements/core/requirements-core-foundation.md` → использует `core-requirements.md`
- `docs/requirements/core/requirements-core-architecture.md` → использует `core-requirements.md`
- `docs/requirements/core/requirements-core-base-classes.md` → использует `core-requirements.md`
- `docs/requirements/core/requirements-core-services.md` → использует `core-requirements.md`
- `docs/requirements/core/requirements-core-api.md` → использует `core-requirements.md`

**Admin Platform:**
- `docs/requirements/admin/requirements-admin-platform.md` → использует `admin-requirements.md`
- `docs/requirements/admin/requirements-admin-api.md` → использует `admin-requirements.md`
- `docs/requirements/admin/requirements-admin-content.md` → использует `admin-requirements.md`

**Commerce & Pages:**
- `docs/requirements/commerce/requirements-commerce-catalog.md` → использует `catalog-requirements.md`
- `docs/requirements/commerce/requirements-admin-commerce.md` → использует `catalog-requirements.md`
- `docs/requirements/commerce/requirements-pages-module.md` → использует `landing-requirements.md`

**Testing:**
- `docs/requirements/testing/requirements-testing-blueprint.md` → использует `test-requirements.md`
- `docs/requirements/testing/requirements-testing-*.md` → использует `test-requirements.md`

**Status Trackers:**
- `docs/requirements/requirements-status-tracker-*.md` → использует `missed-requirements.md`

**Требования в пакетах:**
- `packages/*/docs/requirements/requirements-*.md` → синхронизируются с соответствующими партиалами

**Важно:** Основные документы должны ссылаться на партиалы, а не дублировать их содержимое. При миграции требований в пакеты партиалы также обновляются.

## 📋 Правила работы

### При добавлении нового компонента:

1. Добавить в соответствующий партиал (admin/catalog/core/frontend)
2. Автоматически добавить в соответствующий `docs/requirements/requirements-status-tracker-*.md` как невыполненное (❌ ОТСУТСТВУЕТ)
3. Добавить требования к тестам в `docs/requirements/testing/requirements-testing-*.md`
4. Обновить статистику в tracker файлах
5. **КРИТИЧНО:** Никогда не использовать "опционально" - компонент либо есть, либо его нет
6. **Если компонент в пакете:** Обновить требования в `packages/*/docs/requirements/requirements-*.md`

### При реализации компонента:

1. Отметить как выполненное в соответствующем `docs/requirements/requirements-status-tracker-*.md` (✅ РЕАЛИЗОВАНО)
2. Обновить соответствующий партиал - отметить статус (✅ РЕАЛИЗОВАНО)
3. Обновить `docs/requirements/testing/requirements-testing-*.md` - добавить тесты
4. Обновить статистику в tracker файлах
5. **КРИТИЧНО:** Убедиться, что нет упоминаний "опционально"
6. **Если компонент в пакете:** Обновить требования в `packages/*/docs/requirements/requirements-*.md`

### При изменении требования:

1. Обновить соответствующий партиал
2. Обновить все связанные партиалы
3. Проверить отсутствие дублирования
4. Обновить статистику

## 🚨 Критические правила

1. **НЕ ДУБЛИРОВАТЬ** - каждое требование только в одном партиале
2. **ВСЕГДА синхронизировать** - при изменении одного партиала обновлять связанные
3. **ВСЕГДА проверять** - перед обновлением проверить текущее состояние
4. **ВСЕГДА обновлять статистику** - после изменений обновить статистику
5. **НЕТ ПОНЯТИЯ "ОПЦИОНАЛЬНО"** - компонент либо реализован (✅), либо отсутствует (❌)

## 📊 Примеры использования

### Пример 1: Добавление нового контроллера админки

```markdown
1. Добавить в partials/admin-requirements.md
2. Добавить в partials/docs\requirements\project-requirements-missed.md как невыполненное
3. Добавить в partials/docs\requirements\project-requirements-tests.md требования к тестам
4. Обновить статистику
```

### Пример 2: Реализация компонента

```markdown
1. Найти в partials/docs\requirements\project-requirements-missed.md
2. Отметить как выполненное (✅)
3. Обновить соответствующий партиал
4. Обновить partials/docs\requirements\project-requirements-tests.md
5. Обновить статистику
```

## 🔍 Проверка синхронизации

Перед обновлением документов проверить:

- [ ] Нет дублирования между партиалами
- [ ] Все ссылки актуальны
- [ ] Статус в `docs/requirements/requirements-status-tracker-*.md` соответствует реальности
- [ ] Тесты в `docs/requirements/testing/requirements-testing-*.md` соответствуют компонентам
- [ ] Статистика актуальна
- [ ] **НЕТ упоминаний "опционально"** в документах требований
- [ ] Все компоненты имеют четкий статус (✅ РЕАЛИЗОВАНО или ❌ ОТСУТСТВУЕТ)
- [ ] Требования в пакетах синхронизированы с основным `docs/requirements/`
- [ ] Все пакеты содержат актуальные требования в `packages/*/docs/requirements/`
- [ ] Gap-файлы миграции содержат секцию "Миграция документов требований"

## 📦 Работа с требованиями в пакетах

### Миграция требований в пакеты

При миграции кода в пакет, соответствующие документы требований также мигрируются:

1. **Определение документов** - проверить gap-файл миграции (`gap-package-migration-*.md`) на наличие секции "Миграция документов требований"
2. **Создание структуры** - создать `packages/{type}/{package-name}/docs/requirements/` с минимальным набором:
   - `README.md` - описание структуры требований
   - `requirements-{module}.md` - основные требования
   - `requirements-testing-{module}.md` - тестовые требования (если есть)
3. **Миграция документов** - перенести соответствующие разделы из `docs/requirements/` в пакет
4. **Обновление ссылок** - в основном `docs/requirements/` оставить ссылку на требования в пакете
5. **Синхронизация tracker** - обновить tracker файлы с указанием нового расположения

### Стандарт gap-файлов

Использовать стандарт из `.carior/roles/requirements-sync/gap-files-format-standard.md` для оформления gap-файлов миграции, включая секцию "Миграция документов требований".

