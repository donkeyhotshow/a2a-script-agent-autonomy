# Список основных систем и подсистем проекта admin-app

## 1. Модульная система (Module System)
- Версионируемые модули (v1, v2, ...), строгая структура директорий: docs/, actions/, templates/, code/, validations/, data/, pages/, state/, commands/, _i/, assets/
- Категории модулей:
  - Login Form Modules (аутентификация)
  - Playground Modules (демо/тестовые)
  - Primary Form Modules (сложные формы)
  - Landing Page Modules (презентационные страницы)

## 2. JSON-Driven UI System
- UI описывается декларативно в JSON
- Рендеринг через Vue.js (SPA) + PrimeVue
- Менеджеры: hub, formManager, actionManager, propsManager, themeManager, timerManager, layoutManager, menuManager, modalManager
- Компоненты-обёртки для PrimeVue

## 3. PHP Backend (Core Backend)
- Laravel 11, кастомный JSON-фреймворк (app/AiRudeDepot)
- DataHub, Processors, Scenario Engine
- Artisan-команды для автоматизации

## 4. AI Task System (Система сценариев и задач)
- Автоматизация рабочих процессов через сценарии и задачи
- Основные точки входа: main.ps1, main-work.ps1, main-index.ps1
- PHP-движок сценариев: invoke-scenario-engine.php

## 5. Система автоматизации и скриптов
- PowerShell-скрипты (main.ps1, main-work.ps1, main-index.ps1)
- .bat-скрипты для запуска и обслуживания
- Стандарты для скриптов и процессов (script/docs/standards)

## 6. Система документации и стандартов
- docs/ — основная документация
- standards/ — стандарты разработки, структуры, процессов
- checklists/ — чек-листы для верификации

## 7. Система установки и обновления модулей
- install-modules/aiInstaller — инсталлятор модулей
- install-modules/aiCore — ядро
- overlay-merge стратегия для версий

## 8. Система тестирования
- tests/ — тесты (phpunit, jest)
- database/testing.sqlite — тестовая БД

## 9. Система хранения и ресурсов
- storage/ — рабочие и временные файлы
- resources/ — общие ресурсы (backend, frontend)
- public/ — публичные ассеты

## 10. Система маршрутизации и API
- routes/ — маршруты
- config/ — конфиги (в т.ч. customlinks.php для документации)

---

Документ сгенерирован автоматически на основе анализа структуры и документации проекта.
