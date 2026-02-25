# Корневой Документ: Архитектура, Требования и Глоссарий

## 1. Введение

Этот документ объединяет ключевые требования, архитектурные принципы, глоссарий и ссылки на стандарты для модульной JSON-управляемой административной системы. Он служит основой для понимания устройства, целей и стандартов проекта.

---

## 2. Требования и цели проекта

### Project Requirements

**Project Title:** Project Requirements

**Introduction:** This document formalizes project goals, requirements, and constraints

#### Project Goals
- **Primary Goal:** Achieve consistent, automated generation of new application modules based on defined examples and specifications, minimizing manual coding and ensuring reliability.
- **Core Application Goals:**
  - Develop a highly modular and extensible administration panel.
  - Implement a powerful JSON-driven UI engine for rendering interfaces dynamically.
  - Utilize a robust architecture supporting clear separation of concerns (backend logic, UI rendering, data management).
  - Establish well-defined development processes and comprehensive documentation to guide both human and AI developers.
  - Focus on automation of development and operational tasks where possible.

#### Technologies Used
- Laravel 11, Inertia.js, Vue.js, Options API, PrimeVue, Tailwind CSS, SCSS, @apply, phpunit, jest, PHP 8.3+ MySQL 8.0+, Fedora 40+ || Windows 10+

#### User Roles and Permissions
- Администратор (да)
- Менеджер (да)
- Гость (да)
- Остальные роли: TBD

#### Success Metrics
- Является ли целевая страница интерактивной и кликабельной?
- как минимум 1 страницy.

#### Project Requirements List
- **UI/UX Principles:** Основная логика UI определяется динамически через JSON и ответы сервера ([customHooks](../ui/json-ui/core-concepts/module-actions.md) для фронтенд-реакций, instructions для бэкенд-управляемых изменений). Конкретные стандарты UI/UX будут определяться по мере необходимости.
- **Design Guidelines:** Формальный стайл-гайд отсутствует, решения принимаются по ходу работы, ориентируясь на PrimeVue и согласованность.
- **Key Features:**
  - Динамический рендеринг пользовательского интерфейса на основе [JSON-схем](../standards/json-template-schema.md).
  - Обработка действий на стороне сервера, инициируемая через JSON ([server-actions](../ui/json-ui/commands-and-operations/server-actions-reference.md)/instructions).
  - [Модульная архитектура](../ui/json-ui/module-architecture/README.md) для административных функций.
  - Система аутентификации и авторизации пользователей (детализация ролей будет добавлена позже).
- **Performance:** Специфические метрики не определены, вопросы производительности рассматриваются по мере необходимости.
- **Security:**
  - Базовые меры безопасности Laravel (CSRF и др.)
  - Управление доступом на основе ролей
  - Валидация входных данных на сервере
- **Accessibility:** Специфические стандарты (WCAG) не требуются, базовые аспекты могут быть учтены при использовании стандартных компонентов.
- **Other Criteria:** Нет дополнительных критериев на данный момент
- **Development Workflows:**
  - Планирование и генерация с AI (спецификация, генерация кода, верификация, утверждение)
  - Разработка и коррекция (реализация, анализ, коррекция, повторение цикла)

#### Task Management Protocol
- Немедленная фиксация задач при обнаружении необходимости
- Все задачи — отдельные Markdown-файлы в `docs/tasks/`, формат имени: `TASK-XXX-Краткое-Описание-Задачи.md`
- Проверка на дубликаты перед созданием
- Структура задачи: описание, статус, приоритет, зависимости, связанные документы, примечания
- Интеграция с `@scratchpad.md`

#### Project File Structure
- app — папка с кодом
  - app/AiRudeDepot — кастомный JSON фреймворк
  - app/Console/Commands — консольные команды
    - app/Console/Commands/Config — конфигурация команд
- config — json и php конфиги
- docs — основная документация
- docs-mirrors — md-файлы, описывающие исходники
- implement-modules — модули
- install-modules/aiInstaller — инсталлятор
- install-modules/aiCore — статические файлы ядра
- resources/backend + resources/frontend — точки входа для рендеринга
- resources/common — общее
- routes — маршрутизация
- storage/ai/* — установленные модули
- storage/ai*/ — рабочие файлы
- tests — тесты

#### Mandatory Reading For New Sessions
- README.md (корневой файл проекта)
- /docs/ROOT.md (этот файл)
- docs/system-overview.md
- docs/glossary.md

---

## 3. Обзор системы

(Вставлен текст из docs/system-overview.md)

# System Overview

This document provides a high-level overview of the entire system, outlining its purpose, architecture, data flow, and major components. It serves as the primary entry point for understanding the system's structure and functionality from a top-down perspective.

## 1. Purpose

The system is an administrative application designed to manage specific backend processes or data. It features a dynamic user interface generated based on instructions and data provided by the PHP backend, aiming for a flexible and maintainable way to build administrative UIs.

## 2. Architecture Overview

The system follows a **Client-Server** architecture:

- **Backend (Server):** A PHP application responsible for business logic, data management, and defining the UI structure/content.
- **Frontend (Client):** A Vue.js Single Page Application (SPA) that dynamically renders the user interface based on JSON instructions received from the backend. It utilizes the PrimeVue component library.

### Key Principles:

- **Backend-Driven UI:** The structure, content, and behavior of the frontend UI are largely dictated by JSON responses from the PHP backend.
- **Modularity:** Both backend ([Core Classes](../core/README.md)) and frontend ([UI Managers](../ui/resources/managers/README.md), [Components](../ui/resources/common/elements/primevue/components/README.md)) are designed with distinct responsibilities.
- **Component-Based Rendering:** The frontend uses reusable Vue components (wrappers around PrimeVue elements) to render the UI specified in the JSON.

## 3. Data Flow (Request Lifecycle Example)

A typical interaction follows these steps:

1. **User Interaction:** The user performs an action in the Vue.js frontend (e.g., clicks a button, submits a form).
2. **Frontend Request:** The relevant Vue component or UI Manager (e.g., [`ActionManager`](../ui/resources/managers/ActionManager.md), [`FormManager`](../ui/resources/managers/FormManager.md) via [`HubManager`](../ui/resources/managers/HubManager.md)) captures the interaction and sends an asynchronous request (API call) to the PHP backend, often including form data or action identifiers.
3. **Backend Processing:** The PHP backend ([`App`](../core/AiRudeDepot/App.md) or specific controller like [`ModuleController`](../concepts/ModuleRouting.md)) receives the request. It uses Core classes ([`ProcessInstruction`](../core/AiRudeDepot/Render/ProcessInstruction.md), [`Data`](../core/AiRudeDepot/Support/Data.md), [`Model`](../core/AiRudeDepot/StorageDataModules/Model.md), [`DataHub`](../core/AiRudeDepot/Support/DataHub.md), etc.) to perform business logic, validate data, interact with the database (via [`Mysql`](../core/AiRudeDepot/StorageDataModules/Mysql.md)), and determine the response.
4. **Response Generation:** The backend generates a JSON response ([`StepResponse`](../core/AiRudeDepot/StepResponse/README.md) structure). This response typically contains data to be displayed, instructions for UI updates (e.g., show a notification, update a component's state), or even definitions for new UI sections to be rendered.
5. **Frontend Response Handling:** The Vue.js frontend receives the JSON response. The [`HubManager`](../ui/resources/managers/HubManager.md) likely coordinates distributing the data and instructions to the appropriate Managers or components.
6. **UI Update:** Components update their state based on the received data, or the [`RenderJson`](../ui/json-ui/core-concepts/rendering-pipeline.md) component might render new UI elements based on JSON definitions, leading to changes visible to the user.

## 4. Major Subsystems

### 4.1. Core Backend (`/core`)

- **Purpose:** Provides the foundational server-side logic, data handling, session management, and request processing capabilities.
- **Key Components:** [`App`](../core/AiRudeDepot/App.md) (entry point/request handling), [`ProcessInstruction`](../core/AiRudeDepot/Render/ProcessInstruction.md) (interpreting actions), [`Data`](../core/AiRudeDepot/Support/Data.md) / `DataManipulateHelper` (data handling), [`DataHub`](../core/AiRudeDepot/Support/DataHub.md) (data persistence/session), [`Model`](../core/AiRudeDepot/StorageDataModules/Model.md)/[`Mysql`](../core/AiRudeDepot/StorageDataModules/Mysql.md) (database interaction), `UrlHelper` (URL generation).
- **Detailed Docs:** [Core Backend Details](../core/README.md)

### 4.2. UI Layer (`/resources/common/js`)

- **Purpose:** Renders the dynamic user interface and manages client-side state and interactions based on backend instructions.
- **Key Components:**
    - **Rendering Pipeline:** [`RenderJson.vue`](../ui/json-ui/core-concepts/rendering-pipeline.md) (renders UI from JSON), `Presets.vue` (applies configurations), `component-map.json` (maps JSON types to Vue components).
    - **UI Managers:** [`HubManager`](../ui/resources/managers/HubManager.md) (central coordinator), [`FormManager`](../ui/resources/managers/FormManager.md), [`ActionManager`](../ui/resources/managers/ActionManager.md), [`PropsManager`](../ui/resources/managers/PropsManager.md), [`ThemeManager`](../ui/theming/managers.md), `TimerManager`, `LayoutManager`, `MenuManager`, `ModalManager` (handle specific UI concerns).
    - **Element Wrappers:** [Vue components](../ui/resources/common/elements/primevue/components/README.md) wrapping PrimeVue elements (`Button.vue`, `Password.vue`, `Card.vue`, etc.) used by `RenderJson`.
- **Detailed Docs:** [UI Layer Details](../ui/README.md)

*(Add other major subsystems if applicable)*

---

## 4. Расширенное описание и глоссарий

(Вставлен текст из docs/9.md)

# Expanded Summary (with Key File References)

This project is a highly modular, JSON-driven admin system designed for automation, extensibility, and strict adherence to standards. Its architecture is built on a hybrid of PowerShell and PHP orchestration, with a strong focus on declarative configuration, scenario-based automation, and robust validation.

## Core Architecture

- **Orchestration & Automation:**  
  - **PowerShell Scripts:** `main.ps1`, `main-work.ps1`, and `main-index.ps1` are the entry points for managing modules, tasks, scenarios, and index queries.  
  - **PHP Scenario Engine:** `invoke-scenario-engine.php` executes scenario steps, manages context, and interacts with progress markers and task definitions.
  - **Artisan Commands:** Custom Laravel commands automate merging, validation, cleanup, export, deployment, and more.

- **Module System:**  
  - **Versioned Modules:** Each module is versioned (`v1`, `v2`, etc.), with the installer merging files from all versions into a single runtime module.  
  - **Strict Structure:** Modules must follow a strict directory and file structure (`docs/`, `actions/`, `templates/`, `code/`, `validations/`, `data/`, `pages/`, `state/`, `commands/`, `_i/`, `assets/`).  
  - **Discovery & Installation:** The `_i/` directory (with `meta.json` and `files-by-block.json`) is essential for module discovery and installation.
  - **Key References:**  
    - [StrictModuleChecklist.md](/docs/guides/StrictModuleChecklist.md)  
    - [module-validation-guide.md](/docs/guides/module-validation-guide.md)  
    - [module-installer-integration-setup.json](/docs/processes/module/module-installer-integration-setup.json)  
    - [module-lifecycle-workflow.json](/docs/processes/module/module-lifecycle-workflow.json)  
    - [installation-format.md](/docs/ui/module-architecture/installation-format.md)  
    - [directory-structure.md](/docs/ui/module-installation/directory-structure.md)

- **Validation & Standards:**  
  - **JSON Schema Validation:** All module files are validated against schemas (e.g., `Instructions.json` for server actions).  
  - **Checklists:** Documents like [StrictModuleChecklist.md](/docs/guides/StrictModuleChecklist.md) and [ModuleNormalizationChecklist.md](/docs/processes/module/module-lifecycle-workflow.json) enforce best practices and completeness.
  - **Manual Review:** Due to validator limitations, comparison with reference modules and manual review are required.
  - **Key Standards:**  
    - [scenario-standard.json](/docs/standards/scenario-engine/scenario-standard.json)  
    - [task-definition-standard.json](/docs/standards/task-manager/task-definition-standard.json)  
    - [operational-principles.json](/docs/standards/ai-agent/operational-principles.json)  
    - [ai-task-system-operation-standard.md](/docs/standards/ai-agent/ai-task-system-operation-standard.md)

- **Indexing & Search:**  
  - **Index Files:** `@data.index.json` and `@docs.index.json` provide fast lookup and cross-referencing for code, docs, and modules.  
  - **Index Processor:** `main-index.ps1` and `index-processor.php` aggregate, filter, and query index entries for navigation, audits, and automation.
  - **Key Guides:**  
    - [indexing-usage-guide.json](/docs/guides/indexing-usage-guide.json)  
    - [manual-index-tagging-guide.json](/docs/guides/manual-index-tagging-guide.json)  
    - [index-data-collection.md](/docs/processes/workflow/index-data-collection.md)

- **Storage Abstraction:**  
  - **DataHub:** Central class for accessing files, session, buffer, MySQL, Eloquent models, and directories using a unified address format.  
  - **Controllers:** Each storage type (File, Session, Buffer, Model, MySQL, Directory) has a dedicated controller for CRUD operations.

- **UI & API:**  
  - **JSON-Driven UI:** The frontend is rendered from JSON definitions, using a component map (`component-map.json`) to map types to Vue/PrimeVue components.  
  - **Custom Hooks & Actions:** UI interactivity is handled via `customHooks` (client-side) and server-side `Instructions` (actions).
  - **Backend Controllers:** Laravel controllers provide endpoints for module management, file storage, and more.
  - **Key UI Docs:**  
    - [json-template-schema.md](/docs/ui/json-template-schema.md)  
    - [primevue-components.md](/docs/ui/primevue-components.md)  
    - [primevue-rude-vs-original-structure.md](/docs/ui/primevue-rude-vs-original-structure.md)  
    - [ui-examples.md](/docs/ui/ui-examples.md)  
    - [ui-examples-complex.md](/docs/ui/ui-examples-complex.md)  
    - [elements-v1.md](/docs/ui/core-concepts/elements-v1.md)  
    - [elements-v2.md](/docs/ui/core-concepts/elements-v2.md)  
    - [component-syntax.md](/docs/ui/core-concepts/component-syntax.md)  
    - [module-actions.md](/docs/ui/core-concepts/module-actions.md)  
    - [server-actions-reference.md](/docs/ui/commands-and-operations/server-actions-reference.md)

- **Automation & Workflow:**  
  - **Scenario Engine:** Scenarios (JSON or PHP) automate multi-step workflows (e.g., task activation, data collection, validation).  
  - **Task Lifecycle:** Tasks are created, activated, processed, and closed via scenarios and tracked with progress markers.
  - **Key Process Docs:**  
    - [iterative-mode-development-process.json](/docs/processes/workflow/iterative-mode-development-process.json)  
    - [architect-act-mode-workflow.json](/docs/processes/workflow/architect-act-mode-workflow.json)  
    - [process-analysis-methodology.json](/docs/processes/workflow/process-analysis-methodology.json)  
    - [module-task-creation-process.json](/docs/processes/module/module-task-creation-process.json)  
    - [module-build-process.json](/docs/processes/module/module-build-process.json)

---

# Expanded Glossary (with File References)

(Вставлен текст из docs/9.md и docs/glossary.md, дублирующиеся термины объединены, наиболее полные определения сохранены)

# Глоссарий терминов

(см. объединённый глоссарий ниже)

---

# Ссылки на ключевые документы и стандарты

- [StrictModuleChecklist.md](/docs/guides/StrictModuleChecklist.md)
- [module-validation-guide.md](/docs/guides/module-validation-guide.md)
- [module-installer-integration-setup.json](/docs/processes/module/module-installer-integration-setup.json)
- [module-lifecycle-workflow.json](/docs/processes/module/module-lifecycle-workflow.json)
- [installation-format.md](/docs/ui/module-architecture/installation-format.md)
- [directory-structure.md](/docs/ui/module-installation/directory-structure.md)
- [scenario-standard.json](/docs/standards/scenario-engine/scenario-standard.json)
- [task-definition-standard.json](/docs/standards/task-manager/task-definition-standard.json)
- [operational-principles.json](/docs/standards/ai-agent/operational-principles.json)
- [ai-task-system-operation-standard.md](/docs/standards/ai-agent/ai-task-system-operation-standard.md)
- [indexing-usage-guide.json](/docs/guides/indexing-usage-guide.json)
- [manual-index-tagging-guide.json](/docs/guides/manual-index-tagging-guide.json)
- [index-data-collection.md](/docs/processes/workflow/index-data-collection.md)
- [json-template-schema.md](/docs/ui/json-template-schema.md)
- [primevue-components.md](/docs/ui/primevue-components.md)
- [primevue-rude-vs-original-structure.md](/docs/ui/primevue-rude-vs-original-structure.md)
- [ui-examples.md](/docs/ui/ui-examples.md)
- [ui-examples-complex.md](/docs/ui/ui-examples-complex.md)
- [elements-v1.md](/docs/ui/core-concepts/elements-v1.md)
- [elements-v2.md](/docs/ui/core-concepts/elements-v2.md)
- [component-syntax.md](/docs/ui/core-concepts/component-syntax.md)
- [module-actions.md](/docs/ui/core-concepts/module-actions.md)
- [server-actions-reference.md](/docs/ui/commands-and-operations/server-actions-reference.md)
- [iterative-mode-development-process.json](/docs/processes/workflow/iterative-mode-development-process.json)
- [architect-act-mode-workflow.json](/docs/processes/workflow/architect-act-mode-workflow.json)
- [process-analysis-methodology.json](/docs/processes/workflow/process-analysis-methodology.json)
- [module-task-creation-process.json](/docs/processes/module/module-task-creation-process.json)
- [module-build-process.json](/docs/processes/module/module-build-process.json) 