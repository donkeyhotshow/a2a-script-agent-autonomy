# Стандарт формата Gap-файлов миграции пакетов

## Назначение
Этот документ описывает стандартный формат для всех gap-файлов миграции (`gap-package-migration-*.md`), который обеспечивает четкое разделение между существующими файлами (для миграции) и новыми файлами (для создания).

## Проблема
В текущих gap-файлах не указаны:
- Точные пути к существующим файлам в текущей кодовой базе
- Четкое разделение между существующими файлами (для миграции) и новыми файлами (для создания)
- Маппинг "источник → целевой путь" для каждого файла

## Решение: Стандартный формат

### Обязательные секции

#### 1. Секция "Существующие файлы для миграции"

**Формат:**
```markdown
#### Существующие файлы для миграции

**Категория файлов (существующие в `путь/к/директории/`):**
- ✅ `полный/путь/к/файлу.ext` - описание → мигрировать в `packages/тип/название-пакета/путь/к/файлу.ext`
- ✅ `полный/путь/к/файлу2.ext` - описание → мигрировать в `packages/тип/название-пакета/путь/к/файлу2.ext`
```

**Правила:**
- Указывать полный путь к существующему файлу относительно корня проекта
- Использовать маркер ✅ для существующих файлов
- Использовать маркер ❓ для файлов, которые нужно проверить
- Использовать маркер ⚠️ для файлов, которые НЕ относятся к миграции
- Указывать целевой путь в пакете после стрелки `→`

**Пример:**
```markdown
**Catalog сервисы (существующие в `app/Services/Catalog/`):**
- ✅ `app/Services/Catalog/ProductService.php` - работа с товарами → мигрировать в `packages/hybrid/commerce-catalog/src/Services/Catalog/ProductService.php`
- ✅ `app/Services/Catalog/CartService.php` - управление корзиной (151 строка) → мигрировать в `packages/hybrid/commerce-catalog/src/Services/Catalog/CartService.php`
```

#### 2. Секция "Новые файлы для создания"

**Формат:**
```markdown
#### Новые файлы для создания

**Категория файлов (создать с нуля):**
- 📝 `packages/тип/название-пакета/путь/к/файлу.ext` - описание
- 📝 `packages/тип/название-пакета/путь/к/файлу2.ext` - описание
```

**Правила:**
- Указывать полный путь к новому файлу в пакете
- Использовать маркер 📝 для новых файлов
- Группировать по категориям (структура пакета, конфигурация, тесты и т.д.)

**Пример:**
```markdown
**Структура пакета (создать с нуля):**
- 📝 `packages/hybrid/commerce-catalog/composer.json` - конфигурация PHP пакета
- 📝 `packages/hybrid/commerce-catalog/src/Providers/CommerceCatalogServiceProvider.php` - сервис-провайдер
- 📝 `packages/hybrid/commerce-catalog/README.md` - документация пакета
```

#### 3. Секция "Миграция документов требований"

**Формат:**
```markdown
#### Миграция документов требований

**Документы требований для миграции в пакет:**
- ✅ `docs/requirements/commerce/requirements-commerce-catalog.md` - требования к каталогу → мигрировать в `packages/hybrid/commerce-catalog/docs/requirements/requirements-commerce-catalog.md`
- ✅ `docs/requirements/commerce/requirements-admin-commerce.md` - требования к админ-каталогу → мигрировать в `packages/hybrid/commerce-catalog/docs/requirements/requirements-admin-commerce.md`
- ✅ `docs/requirements/testing/requirements-testing-catalog.md` - тестовые требования → мигрировать в `packages/hybrid/commerce-catalog/docs/requirements/requirements-testing-catalog.md`

**Новые документы требований для создания в пакете:**
- 📝 `packages/hybrid/commerce-catalog/docs/requirements/README.md` - описание структуры требований пакета
- 📝 `packages/hybrid/commerce-catalog/docs/requirements/requirements-core.md` - базовые требования пакета (если требуется)
```

**Правила:**
- Мигрировать только те документы требований, которые относятся к функциональности пакета
- В каждом пакете должен быть минимальный набор: `requirements-{module}.md`, `requirements-testing-{module}.md` (если есть тесты)
- Дополнительно могут быть: `requirements-admin-{module}.md`, `requirements-frontend-{module}.md`, `requirements-core-{module}.md`
- После миграции в основном `docs/requirements/` оставить ссылку на пакет
- Обновить роль Requirements Sync Coordinator для работы с требованиями в пакетах

**Пример структуры требований в пакете:**
```
packages/hybrid/commerce-catalog/
├── docs/
│   └── requirements/
│       ├── README.md                          # Описание структуры требований
│       ├── requirements-commerce-catalog.md   # Основные требования к каталогу
│       ├── requirements-admin-commerce.md     # Требования к админ-каталогу
│       └── requirements-testing-catalog.md    # Тестовые требования
```

#### 4. Секция "Маппинг миграции"

**Формат:**
```markdown
**Маппинг миграции:**
| Источник (существующий файл) | Целевой путь (в пакете) | Действие |
|-------------------------------|-------------------------|----------|
| `путь/к/источнику.ext` | `packages/тип/пакет/путь/к/цели.ext` | Мигрировать |
| `путь/к/источнику2.ext` | `packages/тип/пакет/путь/к/цели2.ext` | Мигрировать |
```

**Правила:**
- Создавать таблицу для каждой категории файлов (сервисы, модели, компоненты и т.д.)
- Указывать точные пути источника и цели
- Указывать действие (Мигрировать, Создать, Разбить и т.д.)

**Пример:**
```markdown
**Маппинг миграции сервисов:**
| Источник (существующий файл) | Целевой путь (в пакете) | Действие |
|-------------------------------|-------------------------|----------|
| `app/Services/Catalog/ProductService.php` | `packages/hybrid/commerce-catalog/src/Services/Catalog/ProductService.php` | Мигрировать |
| `app/Services/Catalog/CartService.php` | `packages/hybrid/commerce-catalog/src/Services/Catalog/CartService.php` | Мигрировать |
```

### Структура документа

```markdown
# Gap: Миграция [Название] в пакет [название-пакета]

## Владелец
Requirements Sync Coordinator

## План миграции
[Краткое описание]

## Связанные файлы
- `путь/к/директории/` - описание
- `packages/тип/название-пакета/` - целевой пакет

## Содержание

### Проблема
[Описание проблемы]

### Текущая ситуация

#### Существующие файлы для миграции
[Список существующих файлов с полными путями]

#### Новые файлы для создания
[Список новых файлов для создания]

#### Миграция документов требований
[Список документов требований для миграции в пакет]

### План миграции файлов

#### Этап 1: Структура пакета
[Целевая структура с указанием источников]

**Маппинг миграции:**
[Таблицы маппинга для каждой категории]

#### Этап 2: Миграция по группам
[Детальный план миграции с указанием путей]

### Критерии успешной миграции
- [ ] Критерий 1
- [ ] Критерий 2

### Риски и mitigation
- **Риск:** Описание
- **Митigation:** Решение

### Зависимости
- Зависимость 1
- Зависимость 2

### Следующие шаги
1. Шаг 1
2. Шаг 2

**Статус:** [Статус]
**Приоритет:** [Приоритет]
**Оценка:** [Оценка]
**Объем:** [Объем]
```

## Примеры использования

### Пример 1: Миграция Factories

```markdown
#### Существующие файлы для миграции

**Catalog Factories (существующие в `database/factories/`):**
- ✅ `database/factories/ProductFactory.php` - фабрика товаров → мигрировать в `packages/hybrid/commerce-catalog/database/factories/ProductFactory.php`
- ✅ `database/factories/ProductVariantFactory.php` - фабрика вариантов → мигрировать в `packages/hybrid/commerce-catalog/database/factories/ProductVariantFactory.php`

#### Новые файлы для создания

**Структура пакета (создать с нуля):**
- 📝 `packages/hybrid/commerce-catalog/composer.json` - конфигурация PHP пакета
- 📝 `packages/hybrid/commerce-catalog/src/Providers/CommerceCatalogServiceProvider.php` - сервис-провайдер
```

### Пример 2: Миграция с разбиением файла

```markdown
#### Существующие файлы для миграции

**Payment Service (существующий в `app/Services/Catalog/`):**
- ✅ `app/Services/Catalog/PaymentService.php` - платежи (510+ строк, нужно разбить) → мигрировать и разбить в `packages/hybrid/commerce-catalog/src/Services/Catalog/`

#### Новые файлы для создания

**Разбиение PaymentService (создать новые файлы):**
- 📝 `packages/hybrid/commerce-catalog/src/Services/Catalog/PaymentProcessor.php` - основная обработка (из PaymentService)
- 📝 `packages/hybrid/commerce-catalog/src/Services/Catalog/PaymentValidator.php` - валидация (из PaymentService)
- 📝 `packages/hybrid/commerce-catalog/src/Services/Catalog/PaymentStatusManager.php` - статусы (из PaymentService)
```

### Пример 3: Файлы, которые нужно проверить

```markdown
#### Существующие файлы для миграции

**Catalog Seeders (проверить наличие в `database/seeders/`):**
- ❓ Проверить наличие catalog-related seeders в `database/seeders/` (если есть - мигрировать в `packages/hybrid/commerce-catalog/database/seeders/`)

**Миграции БД (проверить наличие):**
- ❓ Проверить наличие миграций для catalog моделей в `database/migrations/` (если есть - мигрировать в `packages/hybrid/commerce-catalog/database/migrations/`)
```

### Пример 4: Миграция документов требований

```markdown
#### Миграция документов требований

**Документы требований для миграции в пакет:**
- ✅ `docs/requirements/commerce/requirements-commerce-catalog.md` - требования к каталогу → мигрировать в `packages/hybrid/commerce-catalog/docs/requirements/requirements-commerce-catalog.md`
- ✅ `docs/requirements/commerce/requirements-admin-commerce.md` - требования к админ-каталогу → мигрировать в `packages/hybrid/commerce-catalog/docs/requirements/requirements-admin-commerce.md`
- ✅ `docs/requirements/testing/requirements-testing-catalog.md` - тестовые требования → мигрировать в `packages/hybrid/commerce-catalog/docs/requirements/requirements-testing-catalog.md`

**Новые документы требований для создания в пакете:**
- 📝 `packages/hybrid/commerce-catalog/docs/requirements/README.md` - описание структуры требований пакета

**Структура требований в пакете:**
```
packages/hybrid/commerce-catalog/
├── docs/
│   └── requirements/
│       ├── README.md                          # Описание структуры требований
│       ├── requirements-commerce-catalog.md   # Основные требования к каталогу
│       ├── requirements-admin-commerce.md     # Требования к админ-каталогу
│       └── requirements-testing-catalog.md    # Тестовые требования
```

**После миграции:**
- В основном `docs/requirements/commerce/requirements-commerce-catalog.md` оставить ссылку на требования в пакете
- Обновить все cross-references в других файлах требований
- Обновить tracker файлы с указанием нового расположения требований
```

## Маркеры и их значение

| Маркер | Значение | Использование |
|--------|----------|---------------|
| ✅ | Существующий файл | Файл существует и будет мигрирован |
| 📝 | Новый файл | Файл нужно создать с нуля |
| ❓ | Требуется проверка | Файл может существовать, нужно проверить |
| ⚠️ | Не относится к миграции | Файл существует, но НЕ мигрируется в этот пакет |
| ❌ | Не существует | Файл/пакет не существует |

## Чек-лист для обновления gap-файлов

- [ ] Добавлена секция "Существующие файлы для миграции" с полными путями
- [ ] Добавлена секция "Новые файлы для создания"
- [ ] Добавлена секция "Миграция документов требований" с указанием документов для миграции в пакет
- [ ] Добавлены таблицы маппинга для каждой категории файлов
- [ ] Указаны точные пути источника и цели для каждого файла
- [ ] Использованы правильные маркеры (✅, 📝, ❓, ⚠️, ❌)
- [ ] Обновлены этапы миграции с указанием конкретных путей
- [ ] Указаны действия для каждого файла (Мигрировать, Создать, Разбить)
- [ ] Определена структура требований в пакете (минимальный набор: requirements-{module}.md, requirements-testing-{module}.md)

## Связанные документы

- `docs/requirements/gap-package-migration-catalog-factories-seeders.md` - пример обновленного gap-файла
- `docs/requirements/gap-package-migration-catalog-services-models.md` - пример обновленного gap-файла
- Все остальные `gap-package-migration-*.md` файлы должны быть обновлены по этому стандарту

