# Варианты глубокого разделения admin-app на отдельные проекты (связи только через ссылки)

## Вариант 1. Максимально атомарное разделение по функциональным областям

### 1.1. Проект: core-backend
- app/AiRudeDepot/
- app/Providers/
- app/Console/
- config/app.php, config/services.php, config/database.php, config/logging.php
- routes/web.php, routes/api.php
- composer.json, artisan
- Связи: на core-api, core-data, core-scenarios

### 1.2. Проект: core-api
- app/Http/
- app/Facades/
- app/Feature/
- config/cors.php, config/sanctum.php
- routes/api.php
- Связи: на core-backend, core-data

### 1.3. Проект: core-data
- app/Models/
- database/migrations/
- database/factories/
- config/database.php
- Связи: на core-backend, core-api

### 1.4. Проект: core-scenarios
- app/Hooks/
- app/Services/
- script1/engine/
- install-modules/aiCore/
- Связи: на core-backend, core-api

### 1.5. Проект: ui-engine
- resources/
- public/
- vite.config.js, tailwind.config.js, postcss.config.js
- Связи: на ui-modules, ui-templates

### 1.6. Проект: ui-modules
- implement-modules/
- storage/ai*
- Связи: на ui-engine, core-api

### 1.7. Проект: ui-templates
- implement-modules/*/templates/
- implement-modules/*/actions/
- implement-modules/*/pages/
- Связи: на ui-modules, ui-engine

### 1.8. Проект: automation-scripts
- script1/
- main*.ps1, main*.bat, test.bat
- Связи: на core-backend, core-scenarios, ui-modules

### 1.9. Проект: testing-suite
- tests/
- database/testing.sqlite
- phpunit.xml, jest.config.cjs
- Связи: на core-backend, core-api, ui-engine

### 1.10. Проект: documentation
- docs/
- docs-mirrors/
- checklists/
- PROJECT_DOCUMENTATION.md
- Связи: на все остальные (описание, стандарты, гайды)

---

## Вариант 2. По уровням ответственности и разбиению на микросервисы

- **service-auth**: всё для аутентификации (app/Http/Auth, login-form, config/sanctum.php)
- **service-forms**: primary-form, contact-form, playground, app/Http/Controllers/Forms
- **service-landing**: landing-main-page, app/Http/Controllers/Landing
- **service-qtu**: question-to-user, app/Http/Controllers/QTU
- **service-topbar**: top-bar, app/Http/Controllers/TopBar
- **service-api**: app/Http/Controllers/Api, routes/api.php
- **service-data**: app/Models, database/
- **service-scenarios**: script1/engine/scenarios, app/Hooks, app/Services
- **service-automation**: script1/, main*.ps1, main*.bat
- **service-ui**: resources/, public/, vite.config.js
- **service-docs**: docs/, docs-mirrors/, checklists/

---

## Вариант 3. По типу артефактов и их назначению

- **backend-core**: app/AiRudeDepot, app/Providers, config/
- **backend-controllers**: app/Http, app/Console, routes/
- **frontend-core**: resources/, public/, vite.config.js
- **modules-core**: implement-modules/, storage/ai*, install-modules/
- **automation-core**: script1/, main*.ps1, main*.bat
- **testing-core**: tests/, database/testing.sqlite, phpunit.xml
- **docs-core**: docs/, docs-mirrors/, checklists/

---

# Примечания
- В каждом проекте README.md с описанием связей (например, "использует API из ...", "подключает модули из ...").
- Связи реализуются через документацию, относительные пути, git submodule, symlink или API.
- Такой подход позволяет полностью изолировать разработку, тестирование и деплой каждого блока.

---

Документ сгенерирован автоматически. Для детализации любого варианта — уточните номер или область.
