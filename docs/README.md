# Документация A2A Coding Orchestrator

**Точка входа:** начни отсюда. Все ссылки ведут к каноническим документам без дублирования.

---

## Корень проекта

| Документ | Назначение |
|----------|------------|
| [AGENTS.md](../AGENTS.md) | Что делать сейчас: цель, быстрый старт, ссылки на детали |
| [PROMPT-FOR-SESSION.md](../PROMPT-FOR-SESSION.md) | Промпт для новой сессии (копировать в чат) |
| [SEQUENCE.md](../SEQUENCE.md) | Последовательность наполнения графа, JSON-сниппеты |
| [LOADING.md](../LOADING.md) | Нейроны, entity types, relation types, config |
| [json-in-cmd.md](../json-in-cmd.md) | JSON payloads для Requests API (curl, PowerShell) |
| [DEV_PROJECT.json](../DEV_PROJECT.json) | Dev-проект (websitestore), путь, challenges |

---

## Протокол и архитектура

| Документ | Назначение |
|----------|------------|
| [a2a-client/docs/requirements.md](../a2a-client/docs/requirements.md) | **Протокол:** context block, file blocks, new_task, tasks, request_files |
| [server-command-restrictions.md](server-command-restrictions.md) | **Ограничения:** допустимые команды/промпты на сервер |
| [graph-local-config.md](graph-local-config.md) | **Граф:** локальная настройка, не через диалог; сервер=сбор контекста, клиент=файлы |
| [neurons-and-paths-law.md](neurons-and-paths-law.md) | **Закон:** пути не в контексте; нейроны — только от задачи, всегда действуют |
| [etalon-neuron-activation.md](etalon-neuron-activation.md) | **Etalon:** θ (theta) scenarios — short/large task, task-triggered vs content-triggered |
| [../all-posible-concept-realisations/README.md](../all-posible-concept-realisations/README.md) | **Варианты графа:** 9 возможных применений графа в системе |
| [flow-graph-requests.md](flow-graph-requests.md) | Поток: API → RequestProcessor → GraphStore, компоненты, трассировка |
| [code-hierarchy.md](code-hierarchy.md) | **Иерархия кода:** репозиторий, a2a-server/src, knowledge, правила зависимостей |
| [code-hierarchy-violations.md](code-hierarchy-violations.md) | Нарушения иерархии (routes→knowledge, controller→repo, knowledge→ml) |
| [graph-input-tasks.md](graph-input-tasks.md) | Задачи по вводу данных в граф (отдельные) |
| [adr/README.md](adr/README.md) | Architecture Decision Records |
| [adr-hacks/README.md](adr-hacks/README.md) | Хаки: direct API bypass, etalon raw (A/B/D/E) |
| [../tasks/README.md](../tasks/README.md) | Задачи развития сервисов (из анализа хаков) |

---

## Планы реализации

| Документ | Назначение |
|----------|------------|
| [../plans/a2a-server-requirements-analysis.md](../plans/a2a-server-requirements-analysis.md) | Анализ требований к серверу |
| [../plans/a2a-server-implementation-plan.md](../plans/a2a-server-implementation-plan.md) | План реализации сервера |
| [../plans/a2a-server-database-schema.md](../plans/a2a-server-database-schema.md) | Схема базы данных |
| [../plans/a2a-server-context-handler-plan.md](../plans/a2a-server-context-handler-plan.md) | План context handler |
| [../plans/a2a-client-api-specification.md](../plans/a2a-client-api-specification.md) | Спецификация API клиента |
| [../plans/async-protocol-change.md](../plans/async-protocol-change.md) | Изменения async протокола |
| [../plans/playwright-e2e-tests-plan.md](../plans/playwright-e2e-tests-plan.md) | План E2E тестов |
| [../plans/a2a-ml-knowledge-separation-plan.md](../plans/a2a-ml-knowledge-separation-plan.md) | Разделение ML и knowledge |
| [../plans/localstorage-migration.md](../plans/localstorage-migration.md) | Миграция localStorage |
| [../plans/a2a-training-plan.md](../plans/a2a-training-plan.md) | План обучения |

---

## Проект и вызовы

| Документ | Назначение |
|----------|------------|
| [websitestore-challenges.md](websitestore-challenges.md) | Вызовы websitestore (большой проект, дыры, кастомная архитектура) |

---

## Нейроны и контекст

| Документ | Назначение |
|----------|------------|
| [a2a-server/docs/neurons-catalog.md](../a2a-server/docs/neurons-catalog.md) | **Каталог нейронов** (автоген: `cd a2a-server && npm run neurons:doc`) |
| [a2a-server/docs/neurons.md](../a2a-server/docs/neurons.md) | **Нейроны:** CLI, типы, request_files |

- Нейрон = множество триггеров; partial match → подозрение.
- В контекст попадают **данные триггера** (не нейрон), чтобы на следующей итерации ре-триггернуть и обработать другие данные.
- Подозрительные нейроны → производные нейроны → приоритетно `request_files` → learning-lessons → перекрывает тревогу; в контексте остаются заплатки, тревога в модель.
- [LOADING.md](../LOADING.md) § Neurons

## Связи (без дублирования)

- **Протокол** → requirements.md (единственный источник)
- **Payload/curl** → json-in-cmd.md
- **Граф (entities, relations)** → LOADING.md
- **Поток/трассировка** → flow-graph-requests.md
- **ADR** → docs/adr/
- **Планы** → plans/
