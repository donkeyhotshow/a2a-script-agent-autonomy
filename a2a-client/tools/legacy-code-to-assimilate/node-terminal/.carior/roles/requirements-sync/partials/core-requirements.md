# Партиал: Общие требования и структура

**Границы ответственности:** Только общие требования проекта, структура, базовые классы, API, конфигурации

## 📌 Ответственность этого партиала

Этот партиал содержит **только общие требования проекта** - структуру, архитектуру, модули, зависимости, конфигурации и общую функциональность.

### Что находится в этом партиале:
- ✅ Общие требования проекта и бизнес-логика
- ✅ Структура файлов и директорий проекта
- ✅ Стек технологий и зависимости
- ✅ Модели, миграции, сервисы, контроллеры (общие)
- ✅ Frontend компоненты (Vue, Inertia.js) - общие
- ✅ API спецификации (общие)
- ✅ Конфигурации модулей, ценообразования, локализации
- ✅ Оптимизации кода и базовые классы
- ✅ SSR система

### Что НЕ находится в этом партиале:
- ❌ Требования к админке (находятся в `docs\requirements\project-requirements-admin.md`)
- ❌ Требования к каталогу (находятся в `docs\requirements\project-requirements-catalog.md`)
- ❌ Требования к лендингу (находятся в `docs\requirements\project-requirements-landing.md`)
- ❌ Требования к тестам (находятся в `docs\requirements\project-requirements-tests.md`)
- ❌ Невыполненные требования (находятся в `docs\requirements\project-requirements-missed.md`)

## 🔗 Связанные файлы

- `docs\requirements\project-requirements-admin.md` - админ-панель (использует базовые классы, API)
- `docs\requirements\project-requirements-catalog.md` - каталог (использует базовые классы, API)
- `docs\requirements\project-requirements-landing.md` - лендинг (использует базовые классы, API, SSR)
- `docs\requirements\project-requirements-tests.md` - требования к тестам (для тестов базовых классов)
- `docs\requirements\project-requirements-missed.md` - невыполненные требования (для базовых компонентов)

## 📋 Правила синхронизации

### При добавлении нового общего компонента:
1. Добавить в этот файл описание компонента
2. Обновить `docs\requirements\project-requirements-missed.md` - добавить в список невыполненных (❌ ОТСУТСТВУЕТ)
3. Обновить `docs\requirements\project-requirements-tests.md` - добавить требования к тестам
4. Если компонент используется в админке/каталоге/лендинге - обновить соответствующие файлы со ссылкой

### При реализации компонента:
1. Обновить `docs\requirements\project-requirements-missed.md` - отметить как выполненное (✅ РЕАЛИЗОВАНО)
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для реализованного компонента

### При изменении общего API:
1. Обновить этот файл с новым API
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для нового API
3. Обновить все связанные файлы (admin, catalog, landing) если API используется там

## 📝 Структура общих требований

### Базовые классы
- BaseModel
- BaseService
- BaseController
- BaseApiController
- CrudService

### Трейты
- Auditable
- Cacheable
- SoftDeletesWithAudit

### Общие модели
- Contact
- Project
- Testimonial
- User
- SectionToggle
- ContentBlock
- PricingRule
- AuditLog

### Общие сервисы
- ContactService
- EmailMarketingService
- SectionRegistryService
- AnalyticsService
- EmailService

### Общие контроллеры
- ContactController
- HealthController

### Vue Composables (базовые)
- useReactiveState.ts
- useAsyncOperation.ts
- useFormValidation.ts
- useLocale.ts
- useAnalytics.ts

## 🔄 Правила обновления

1. **При добавлении нового базового класса:**
   - Добавить в раздел "Базовые классы"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

2. **При добавлении нового трейта:**
   - Добавить в раздел "Трейты"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

3. **При добавлении нового общего сервиса:**
   - Добавить в раздел "Общие сервисы"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

4. **При изменении общего API:**
   - Обновить раздел "API Спецификации"
   - Обновить `docs\requirements\project-requirements-tests.md` с новыми тестами
   - Обновить все связанные файлы (admin, catalog, landing) если API используется там


