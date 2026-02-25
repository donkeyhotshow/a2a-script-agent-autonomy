# Партиал: Требования к бэкенду

**Границы ответственности:** Только требования к бэкенду (модели, сервисы, контроллеры, миграции, общие компоненты)

## 📌 Ответственность этого партиала

Этот партиал содержит **только требования к бэкенду** - модели, сервисы, контроллеры, миграции, базовые классы, общие компоненты.

### Что находится в этом партиале:
- ✅ Модели (общие, не админские)
- ✅ Сервисы (общие, не админские)
- ✅ Контроллеры (публичные, не админские)
- ✅ Миграции (общие)
- ✅ Базовые классы (BaseModel, BaseService, BaseController)
- ✅ Трейты (общие)
- ✅ Events и Listeners (общие)
- ✅ Middleware (общие)
- ✅ Form Requests (публичные)

### Что НЕ находится в этом партиале:
- ❌ Админские компоненты (находятся в `docs\requirements\project-requirements-admin.md`)
- ❌ Требования к тестам (находятся в `docs\requirements\project-requirements-tests.md`)
- ❌ Невыполненные требования (находятся в `docs\requirements\project-requirements-missed.md`)
- ❌ Фронтенд требования (находятся в `docs\requirements\project-requirements-core-and-layout.md`)

## 🔗 Связанные партиалы

- `docs\requirements\project-requirements-admin.md` - админские компоненты (для связи)
- `docs\requirements\project-requirements-core-and-layout.md` - фронтенд требования (для API)
- `docs\requirements\project-requirements-tests.md` - требования к тестам бэкенда
- `docs\requirements\project-requirements-missed.md` - невыполненные требования бэкенда

## 📋 Правила синхронизации

### При добавлении нового компонента бэкенда:
1. Добавить в этот партиал описание компонента
2. Обновить `docs\requirements\project-requirements-missed.md` - добавить в список невыполненных
3. Обновить `docs\requirements\project-requirements-tests.md` - добавить требования к тестам
4. Если компонент используется фронтендом - обновить `docs\requirements\project-requirements-core-and-layout.md`

### При реализации компонента:
1. Обновить `docs\requirements\project-requirements-missed.md` - отметить как выполненное
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для реализованного компонента

### При изменении API:
1. Обновить этот партиал с новым API
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для нового API
3. Обновить `docs\requirements\project-requirements-core-and-layout.md` - если изменился фронтенд API

## 📝 Структура требований бэкенда

### Модели (общие)
- Contact
- Project
- Testimonial
- User
- SectionToggle

### Сервисы (общие)
- ContactService
- EmailMarketingService
- SectionRegistryService

### Контроллеры (публичные)
- ContactController
- AnalyticsController (публичный)
- SectionToggleController
- NewsletterController
- HealthController

### Базовые классы
- BaseModel
- BaseService
- BaseController
- BaseApiController
- CrudService

### Трейты (общие)
- Auditable
- Cacheable
- SoftDeletesWithAudit

### Events и Listeners (общие)
- ContactCreated
- SendContactNotification

### Middleware (общие)
- EnsureUserIsAdmin
- RateLimiting
- Localization

### Миграции (общие)
- create_contacts_table
- create_projects_table
- create_testimonials_table
- create_section_toggles_table

## 🔄 Правила обновления

1. **При добавлении новой модели:**
   - Добавить в раздел "Модели"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

2. **При добавлении нового сервиса:**
   - Добавить в раздел "Сервисы"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

3. **При добавлении нового контроллера:**
   - Добавить в раздел "Контроллеры"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`
   - Если есть API - обновить `docs\requirements\project-requirements-core-and-layout.md`

4. **При изменении API:**
   - Обновить раздел "Контроллеры"
   - Обновить `docs\requirements\project-requirements-tests.md` с новыми тестами
   - Обновить `docs\requirements\project-requirements-core-and-layout.md` если изменился фронтенд API


