# Документация A2A Coding Orchestrator

**Точка входа:** начни отсюда. Все ссылки ведут к каноническим документам без дублирования.

---

## Корень проекта

| Документ | Назначение |
|----------|------------|
| [AGENTS.md](../AGENTS.md) | Что делать сейчас: цель, быстрый старт, ссылки на детали |
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
| [flow-graph-requests.md](flow-graph-requests.md) | Поток: API → RequestProcessor → GraphStore, компоненты, трассировка |
| [a2a-server/docs/entry-points.md](../a2a-server/docs/entry-points.md) | Root context, new_task, request_files |
| [code-hierarchy.md](code-hierarchy.md) | **Иерархия кода:** репозиторий, a2a-server/src, knowledge, правила зависимостей |
| [graph-input-tasks.md](graph-input-tasks.md) | Задачи по вводу данных в граф (отдельные) |
| [../archive/](../archive/) | Устаревшие: plans, tasks, knowledge-legacy, docs-obsolete, docs-adr-obsolete; [ARCHIVE-MIGRATION-TASKS.md](../archive/ARCHIVE-MIGRATION-TASKS.md) |
| [adr/README.md](adr/README.md) | Architecture Decision Records |
| [adr-hacks/README.md](adr-hacks/README.md) | Хаки: direct API bypass, etalon raw (A/B/D/E) |

---

## Планы реализации

Планы в [archive/plans/](../archive/plans/) (исторические).

---

## Проект и вызовы

| Документ | Назначение |
|----------|------------|
| [websitestore-challenges.md](websitestore-challenges.md) | Вызовы websitestore (большой проект, дыры, кастомная архитектура) |

---

## Нейроны и контекст

| Документ | Назначение |
|----------|------------|
| [a2a-server/docs/neurons.md](../a2a-server/docs/neurons.md) | **Нейроны:** типы, request_files (CLI → archive/scripts-legacy) |

- Нейрон = множество триггеров; partial match → подозрение.
- В контекст попадают **данные триггера** (не нейрон), чтобы на следующей итерации ре-триггернуть и обработать другие данные.
- Подозрительные нейроны → производные нейроны → приоритетно `request_files` → learning-lessons → перекрывает тревогу; в контексте остаются заплатки, тревога в модель.
- Граф (entities, relations) → flow-graph-requests.md, a2a-server/docs/neurons.md

## Связи (без дублирования)

- **Протокол** → requirements.md (единственный источник)
- **Payload/curl** → archive/json-in-cmd.md (если есть) или docs/adr-hacks
- **Поток/трассировка** → flow-graph-requests.md
- **ADR** → docs/adr/
- **Планы** → archive/plans/
