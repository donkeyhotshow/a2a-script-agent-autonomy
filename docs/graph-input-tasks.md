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

## 2. Ввод по типу сущности

| # | Задача | Файл/паттерн |
|---|--------|--------------|
| 2.1 | Model | app/Models/*.php, extends Model, belongsTo, hasMany |
| 2.2 | Controller | app/Http/Controllers/*.php, extends Controller |
| 2.3 | Request | app/Http/Requests/*.php, extends FormRequest |
| 2.4 | Service | app/Services/*.php или app/Domain/*/Services |
| 2.5 | Vue component | resources/js/Components/*.vue |
| 2.6 | Vue page | resources/js/Pages/*.vue, Inertia |
| 2.7 | Routes | routes/web.php, Route:: |
| 2.8 | Config | config/*.php, composer.json |

---

## 3. Верификация ввода

| # | Задача | Описание |
|---|--------|----------|
| 3.1 | Проверить entities | result.entities, graph_logs |
| 3.2 | Проверить relations | result.relations, handles, validates, uses |
| 3.3 | Проверить questions | При graph_incomplete — questions с hint |
| 3.4 | Проверить graph_logs | question + answer в логах |

