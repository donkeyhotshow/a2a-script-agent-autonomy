# A2A — AGENTS.md (что делать прямо сейчас)

## Главное направление (текущий виток)

**Найти задачу по проекту**, для которой нужно редактировать **2–4 файла**. Сервер собирает контекст для этой задачи и **итерирует**, пока дальнейшее наращивание контекста не станет избыточным. В этот момент — **остановиться**. Это основное предназначение серверной системы (нейроны, граф, request_files, индексы). Дальше — только external AI.

---

Цель: **граф знаний уже есть**, хотим **подзаполнить его вручную**, чтобы быстро упереться в первые реальные проблемы.

**Документация:** [docs/README.md](docs/README.md) — индекс всех документов (без дублирования).

---

## Ссылки

| Что | Куда |
|-----|------|
| Dev-проект, вызовы | [DEV_PROJECT.json](DEV_PROJECT.json), [docs/websitestore-challenges.md](docs/websitestore-challenges.md) |
| Последовательность | [SEQUENCE.md](SEQUENCE.md) |
| Протокол (context, new_task, tasks, request_files) | [a2a-client/docs/requirements.md](a2a-client/docs/requirements.md) |
| Ограничения команд на сервер | [docs/server-command-restrictions.md](docs/server-command-restrictions.md) |
| Граф: локальная настройка (не диалог) | [docs/graph-local-config.md](docs/graph-local-config.md) |
| Граф (entities, relations) | [LOADING.md](LOADING.md) |
| Поток, трассировка | [docs/flow-graph-requests.md](docs/flow-graph-requests.md) |
| Иерархия кода | [docs/code-hierarchy.md](docs/code-hierarchy.md) |
| JSON payloads, curl | [json-in-cmd.md](json-in-cmd.md) |
| Raw примеры (request/response) | [docs/adr-hacks/](docs/adr-hacks/) |
| Задачи развития сервисов | [tasks/](tasks/) |
| ADR | [docs/adr/](docs/adr/) |
| Планы реализации | [plans/](plans/) |

---

## Быстрый старт (2 итерации)

**Requests API:** `POST /api/v1/requests` → poll `.../result`. Base: `http://localhost:3000/api/v1`, Auth: `Bearer a2a_dev_password`.

**Iter1:** POST без codeBlocks → `graph_incomplete` + question.  
**Iter2:** POST с codeBlocks (controller, request, model, service, vue) → `completed`.

Полные примеры: [json-in-cmd.md](json-in-cmd.md), [SEQUENCE.md](SEQUENCE.md).

---

## Запуск сервера

```bash
# Из корня проекта
npm run dev

# Или только сервер
npm run dev:api

# Без авторизации (разработка)
cd a2a-server && npm run dev:no-auth
```

---

## CLI: вопросы из графа

```bash
npm run questions                    # project_path из .a2a-client/projects.json
node scripts/questions-cli.js C:/path/to/project
```

---

## Первые трудности (чеклист)

- Пути/неймспейсы не совпадают (кастомные папки)
- Связи не извлекаются (belongsTo в трейте)
- Импорты неочевидны (app(), resolve())
- Смешение слоёв (controller делает всё)
- Frontend-роутинг (Inertia/Vue)

Подробнее: [docs/websitestore-challenges.md](docs/websitestore-challenges.md).
