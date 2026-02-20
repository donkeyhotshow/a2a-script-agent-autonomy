# LOADING — данные загрузки / training data

Сводка того, что подгружается при старте сервера.

**Индекс:** [docs/README.md](docs/README.md) | **Dev project:** [DEV_PROJECT.json](DEV_PROJECT.json) — websitestore

---

## Neurons (7)

Один нейрон — множество триггеров. Подозрение строится при **неполном сходстве** (partial match).

| id | category | triggers (content-based) |
|----|----------|--------------------------|
| neuron-validation | validation | FormRequest, rules(), validate(, Http\\Requests |
| neuron-auth | auth | Policy, Guard, middleware('auth'), App\\Policies |
| neuron-eloquent | eloquent | extends Model, belongsTo, hasMany, factory, App\\Models |
| neuron-routing | routing | Route::, Controller, web.php, App\\Http\\Controllers |
| neuron-views | views | Inertia, .vue, resources/js, Inertia\\ |
| neuron-testing | testing | Pest, PHPUnit, TestCase, factory(, extends TestCase |
| neuron-project-detector | architecture | laravel/framework, laravel, composer |

All neurons have `actions: inject` (context block). Triggers are content-based (neurons-and-paths-law).

### Нейрон и контекст

- **Нейрон не попадает в контекст**, если его не триггернуло.
- В контекст попадают **данные триггера** (matched paths, partial matches) — чтобы на следующей итерации заново триггернуть нейроны и обрабатывать другие данные.
- Контекст циркулирует между клиентом и сервером; trigger data в контексте обеспечивает реактивацию.

### Нейроны с подозрением → learning-lessons

- **Нейроны с подозрением** создают **другие нейроны** (производные), которые приоритетно влияют на `request_files` — запрашивают нужные файлы.
- Получив правильный файл, цепочка доводит до активации нейрона **learning-lessons**.
- **learning-lessons** может **перекрывать** тревожные нейроны (вся жизнь в циркулируемом context block).
- В контексте остаются **нейроны-заплатки**; тревога уходит в модель (external AI), пока новое правило не будет нарушено снова.

---

## Context blocks (builtin)

**neuron-context-laravel-11**
```
## Laravel 11 Project Structure
- Models: app/Models/
- Controllers: app/Http/Controllers/
- Views: resources/views/
- Routes: routes/
- Stack: laravel, inertia, vue, tailwind
```

---

## Entity types

MODEL, CONTROLLER, SERVICE, REPOSITORY, MIDDLEWARE, VUE_COMPONENT, COMPOSABLE, PHP, JS, CONFIG, OTHER

---

## Relation types

USES, CREATES, EXTENDS, IMPLEMENTS, IMPORTS, BELONGS_TO, HAS_MANY, HAS_ONE, BELONGS_TO_MANY

---

## Config (env)

PORT, HOST, DATABASE_URL, REDIS_URL, JWT_SECRET, A2A_SERVER_PASSWORD, SKIP_AUTH, REQUEST_PROCESSOR_INTERVAL_MS (5000), LOG_LEVEL, LOG_FORMAT

