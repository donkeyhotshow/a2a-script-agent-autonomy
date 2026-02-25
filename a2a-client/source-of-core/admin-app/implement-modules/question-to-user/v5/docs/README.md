# Question To User Module (v5)

## Overview
The Question To User (QTU) module provides a flexible framework for creating interactive dialogues between the system and users. It handles various question types, processes answers, and integrates with the AI Task System.

## Key Features
- Support for various question types (text inputs, radio buttons, dropdowns)
- AI probe question handling
- Integration with the task and scenario management system
- Dynamic form generation

## Directory Structure
```
question-to-user/
├── _i/              # Module metadata and configuration
├── actions/         # Action definitions for data processing
├── code/            # PHP classes (QuestionToUser.php)
├── commands/        # Command scripts for CLI operations
├── data/            # Question sets, templates, blank definitions
├── docs/            # Documentation and examples
├── pages/           # UI pages definitions
├── sections/        # UI section components
├── state/           # Module state storage
├── templates/       # Reusable UI templates
└── validations/     # Validation rules
```

## Usage
1. Import the module into your application
2. Use the QuestionToUser class to initialize and manage question sets
3. Configure question sets in data/question-sets/
4. Implement handlers for responses in actions/

## Examples
See the sample implementation in the pages directory:
- Main interface: pages/page.json
- Task/Scenario management: pages/task-scenario-management-page.json

## Version History
- v5.0.0: Current version with enhanced AI integration
- v4.0.0: Added support for dynamic forms
- v3.0.0: Added task system integration
- v2.0.0: Enhanced UI components
- v1.0.0: Initial basic Q&A functionality

# Модуль `question-to-user` (QTU) v5 - README

## 1. Назначение и Цель

Модуль `question-to-user` (QTU) версии v5 предназначен для динамического отображения наборов вопросов пользователю и
сбора его ответов в рамках UI-фреймворка. Основная задача модуля — предоставить гибкий интерфейс для взаимодействия с
пользователем через заранее определенные или динамически сформированные (другими системами) наборы вопросов.

Ключевые возможности:

- Отображение форм на основе JSON-определений вопросов.
- Сбор и сохранение ответов пользователя.
- Интеграция с общей системой управления задачами и сценариями для получения наборов вопросов и передачи ответов.

Модуль **не предназначен** для:

- Самостоятельной генерации вопросов (это задача внешних AI-сервисов или сценариев).
- Сложной логики ветвления вопросов внутри самого модуля (предполагается, что логика формирования набора вопросов
  выполняется до передачи в QTU).

## 2. Основные сценарии использования

1. **Отображение стандартного набора вопросов**:
    * Система (или пользователь) инициирует загрузку предопределенного набора вопросов (например, из
      `data/question_sets/default-set.json`).
    * Действие `load-question-set.json` читает определения, генерирует UI-структуру формы и отображает ее пользователю.
    * Пользователь вводит ответы.
    * Действие `save-current-answers.json` сохраняет ответы.

2. **Отображение вопросов, предоставленных сценарием**:
    * Внешний сценарий (например, запущенный через `main-work.ps1`) подготавливает JSON-структуру с вопросами.
    * Этот JSON передается в QTU (механизм передачи может варьироваться, например, через DataHub или временный файл,
      который затем читает `load-question-set.json`).
    * Дальнейший процесс аналогичен п.1.

3. **Использование в качестве интерфейса для QTU-задач в AI Task System**:
    * AI Task System может использовать QTU для сбора информации от пользователя в рамках выполнения задачи.
    * Сценарии управления задачами могут вызывать QTU для отображения вопросов, релевантных текущей задаче, и сбора
      ответов.

## 3. Структура Модуля

Основные компоненты модуля QTU v5:

- **`pages/`**: Содержат основные JSON-определения страниц модуля (`page.json`, `dialogs-page.json`,
  `task-scenario-management-page.json`).
- **`sections/`**: Включают переиспользуемые части UI, такие как `main-qtu-interface.json` (для отображения основной
  формы вопросов) и `module-header.json`.
- **`actions/`**: Определения серверных действий, например:
    - `load-question-set.json`: Загрузка и генерация UI для вопросов.
    - `save-current-answers.json`: Сохранение ответов.
    - `clear-current-answers.json`: Очистка формы и ответов.
    - Действия для взаимодействия с системными задачами и сценариями (например, `execute-main-work-scenario.json`).
- **`data/`**:
    - `question_sets/`: Хранение JSON-файлов с определениями наборов вопросов.
    - `user_answer_sets/`: Сохранение ответов пользователя.
    - `system_lists/`: Mock-данные для списков задач, сценариев и т.д.
    - `markers/`, `scenario_inputs/`, `scenario_outputs/`: Для асинхронного взаимодействия с внешними PowerShell
      сценариями.
- **`templates/`**: JSON-шаблоны для динамически отображаемых элементов (например, `question-area.json`,
  `command-execution-form.json`).
- **`_i/`**: Метаданные модуля.
- **`docs/`**: Документация модуля (включая этот файл и `question-to-user-v5-documentation.md` для подробностей).

Полную актуальную структуру см. в `question-to-user-v5-documentation.md`.

## 4. Ограничения и Известные Проблемы

- **Зависимость от UI-фреймворка**: Модуль сильно зависит от возможностей и соглашений основного UI-фреймворка (
  обработка JSON-определений UI, DataHub, выполнение actions).
- **Безопасность**: При сохранении и загрузке данных из файлов (`file!path`) следует учитывать аспекты безопасности и
  контроля доступа, если эти пути могут быть подменены или содержать чувствительные данные.
- **Валидация данных**: Встроенная валидация ответов пользователя на уровне определений вопросов минимальна; основная
  валидация должна либо обеспечиваться UI-компонентами фреймворка, либо выполняться системой, обрабатывающей ответы.
- **Производительность**: Генерация очень больших форм с тысячами вопросов может влиять на производительность.
- Актуальный список известных проблем и их статус см. в `known-issues.md`.

## 5. Миграция с предыдущих версий / на будущие версии

- **Миграция на v5**: Версия v5 представляет собой значительный рефакторинг по сравнению с гипотетическими предыдущими
  версиями, фокусируясь на декларативном UI и stateless actions. Прямой путь миграции старой логики может отсутствовать;
  скорее всего, потребуется адаптация сценариев использования под новую архитектуру.
- **Сосуществование версий**: Модуль спроектирован так, чтобы его разные версии могли сосуществовать в системе. Команда
  `php artisan module:merge question-to-user` помогает управлять активной версией и интеграцией ресурсов.
- **Будущие версии**: Могут включать более тесную интеграцию с AI для динамического изменения вопросов \'\'\'на
  лету\'\'\', улучшенные механизмы валидации, или поддержку более сложных типов данных.

## 6. Дальнейшая информация

Для более подробного ознакомления с архитектурой, потоками данных, определениями actions и структурами данных,
пожалуйста, обратитесь к основной документации модуля:

- **`question-to-user-v5-documentation.md`**: Главный документ, описывающий все аспекты модуля v5.
- **`index.md`**: Оглавление документации модуля.
- **`data-schema.md`**: Подробное описание структур данных.
- **`changelog.md`**: История изменений. 
