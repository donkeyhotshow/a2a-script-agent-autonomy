# Задачи: ввод данных в граф

**Индекс:** [docs/README.md](README.md) | **Поток:** [flow-graph-requests.md](flow-graph-requests.md)

Отдельные задачи по наполнению графа знаний.

---

## 1. Ввод через API

| # | Задача | Описание |
|---|--------|----------|
| 1.1 | POST без codeBlocks | Отправить context с project_path, new_task → получить graph_incomplete + question |
| 1.2 | POST с controller | Добавить controller (path + content) → entities, graph_incomplete (missing types) |
| 1.3 | POST с model | Добавить model → entities, relations при extends/belongsTo |
| 1.4 | POST с request | Добавить FormRequest → entities |
| 1.5 | POST с service | Добавить service → entities |
| 1.6 | POST с vue-component | Добавить .vue → entities |
| 1.7 | POST с vue-page | Добавить Inertia page → entities |
| 1.8 | POST полный стек | controller + request + model + service + vue → completed |

---

## 2. Ввод через process-input

| # | Задача | Описание |
|---|--------|----------|
| 2.1 | MD без file blocks | `npx tsx a2a-server/scripts/process-input.ts docs/adr-hacks/raw/etalon-A-request.md` → 0 neurons |
| 2.2 | MD с одним file | Один file block → entities, graph_incomplete |
| 2.3 | MD с несколькими files | 2–5 file blocks → merge, relations |
| 2.4 | MD полный стек | Все ключевые типы → completed |

---

## 3. Ввод по типу сущности

| # | Задача | Файл/паттерн |
|---|--------|--------------|
| 3.1 | Model | app/Models/*.php, extends Model, belongsTo, hasMany |
| 3.2 | Controller | app/Http/Controllers/*.php, extends Controller |
| 3.3 | Request | app/Http/Requests/*.php, extends FormRequest |
| 3.4 | Service | app/Services/*.php или app/Domain/*/Services |
| 3.5 | Vue component | resources/js/Components/*.vue |
| 3.6 | Vue page | resources/js/Pages/*.vue, Inertia |
| 3.7 | Routes | routes/web.php, Route:: |
| 3.8 | Config | config/*.php, composer.json |

---

## 4. Верификация ввода

| # | Задача | Описание |
|---|--------|----------|
| 4.1 | Проверить entities | result.entities, graph_logs |
| 4.2 | Проверить relations | result.relations, handles, validates, uses |
| 4.3 | Проверить questions | При graph_incomplete — questions с hint |
| 4.4 | Проверить graph_logs | question + answer в логах |

---

## 5. Raw-кейсы (etalon)

| # | Scenario | Файл | Output |
|---|----------|------|--------|
| 5.1 | A — short task, no files | raw/etalon-A-request.md | output/etalon-A-result.md |
| 5.2 | B — arch only | raw/etalon-B-request.md | output/etalon-B-result.md |
| 5.3 | D — task + codeBlocks | raw/etalon-D-request.md | output/etalon-D-result.md |
| 5.4 | E — activates nothing | raw/etalon-E-request.md | output/etalon-E-result.md |

Run: `npx tsx a2a-server/scripts/process-input.ts docs/adr-hacks/raw/etalon-X-request.md output/etalon-X-result.md`
