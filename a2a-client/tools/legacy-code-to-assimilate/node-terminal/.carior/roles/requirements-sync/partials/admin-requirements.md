# Партиал: Требования к админ-панели

**Границы ответственности:** Только требования к административной панели управления

## 📌 Ответственность этого партиала

Этот партиал содержит **только требования к админ-панели** - функционал, структуру, API, компоненты, мультиязычность, управление контентом.

### Что находится в этом партиале:
- ✅ Функциональность админ-панели (управление контентом, модулями, аналитика)
- ✅ Структура админ файлов (контроллеры, сервисы, Vue компоненты)
- ✅ Система динамического меню
- ✅ Мультиязычность и редактирование контента
- ✅ Всевозможный функционал админ-панели
- ✅ API спецификации для админки
- ✅ Контроллеры, Form Requests, Vue компоненты для админки
- ✅ Middleware, Audit Trail для админки

### Что НЕ находится в этом партиале:
- ❌ Общие требования (находятся в `docs\requirements\project-requirements-core-and-layout.md`)
- ❌ Требования к тестам (находятся в `docs\requirements\project-requirements-tests.md`)
- ❌ Невыполненные требования (находятся в `docs\requirements\project-requirements-missed.md`)
- ❌ Требования к лендингу (находятся в `docs\requirements\project-requirements-landing.md`)
- ❌ Требования к каталогу (находятся в `docs\requirements\project-requirements-catalog.md`)

## 🔗 Связанные файлы

- `docs\requirements\project-requirements-core-and-layout.md` - общие требования (для базовых классов, API)
- `docs\requirements\project-requirements-landing.md` - лендинг (для управления контентом лендинга)
- `docs\requirements\project-requirements-catalog.md` - каталог (для управления товарами в админке)
- `docs\requirements\project-requirements-tests.md` - требования к тестам админки
- `docs\requirements\project-requirements-missed.md` - невыполненные требования админки

## 📋 Правила синхронизации

### При добавлении нового компонента админки:
1. Добавить в этот файл описание компонента
2. Обновить `docs\requirements\project-requirements-missed.md` - добавить в список невыполненных (❌ ОТСУТСТВУЕТ)
3. Обновить `docs\requirements\project-requirements-tests.md` - добавить требования к тестам
4. Если компонент использует общие классы - обновить `docs\requirements\project-requirements-core-and-layout.md`

### При реализации компонента:
1. Обновить `docs\requirements\project-requirements-missed.md` - отметить как выполненное (✅ РЕАЛИЗОВАНО)
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для реализованного компонента

### При изменении API админки:
1. Обновить этот файл с новым API
2. Обновить `docs\requirements\project-requirements-tests.md` - добавить тесты для нового API
3. Если изменился фронтенд API - обновить соответствующие Vue компоненты в этом файле

## 📝 Структура требований админки

### Контроллеры админки
- AdminController
- ContentController
- LanguageController
- AnalyticsController
- SectionController
- LogsViewerController
- BackupRestoreController
- StylesController
- ThemeController

### Сервисы админки
- AdminMenuRegistryService
- LanguageService
- AnalyticsService
- BackupService
- PrimeVueService
- ThemeService

### Vue компоненты админки
- Dashboard.vue
- ContentManager.vue
- ContentEditor.vue
- LanguageManager.vue
- AnalyticsDashboard.vue
- ModuleManagement.vue
- LogsViewer.vue
- BackupRestore.vue
- StylesConfig.vue

### Миграции админки
- create_languages_table
- create_content_blocks_table
- create_styles_config_table
- create_themes_table
- create_audit_logs_table

## 🔄 Правила обновления

1. **При добавлении нового контроллера админки:**
   - Добавить в раздел "Контроллеры админки"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

2. **При добавлении нового сервиса админки:**
   - Добавить в раздел "Сервисы админки"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

3. **При добавлении нового Vue компонента админки:**
   - Добавить в раздел "Vue компоненты админки"
   - Обновить `docs\requirements\project-requirements-missed.md`
   - Обновить `docs\requirements\project-requirements-tests.md`

4. **При изменении API админки:**
   - Обновить раздел "API Спецификации для админки"
   - Обновить `docs\requirements\project-requirements-tests.md` с новыми тестами

