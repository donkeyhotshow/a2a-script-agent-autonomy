# DEV PLAN — поточний стан і задачі

*Дата: 2026-01-27*

---

## ISSUE 1 — Роутер: перевірка реальних даних

**Статус:** потребує перевірки

**Проблема:**
Симуляція `fix-vue-imports` колись працювала. Зараз невідомо чи роутер (`action-request-processor.ts`) повертає реальні дані і чи дозволяє вибрати режим.

**Що перевірити:**
- `ActionRequestProcessor.handleTaskRequest` → шлях `actionsToUse.length === 0` → повертає статичний `ROUTER_CHOICES` (hardcoded)
- Якщо `actionRegistry` порожній — LLM не викликається, повертається fallback
- `fix-vue-imports` як action зареєстрований в реєстрі? → перевірити `action-registry.ts`
- Відповідь роутера: `context.execution.step = "router"` + `execute.form.choices` — відповідає `dialog/1/response.json` ✓

**Дії:**
1. Перевірити `actionRegistry.getAllActions()` — чи є там `fix-vue-imports`, `coder`, `coder-smart`
2. Якщо немає — зареєструвати або перевірити де реєстрація відбувається
3. Запустити симуляцію `fix-vue-imports/1` і порівняти з `response.json`

---

## ISSUE 2 — Dialog: зламаний context.history (КРИТИЧНО)

**Статус:** зламано, потребує фіксу

**Проблема:**
Кешування на проксі (`caching.py`) активне для не-promise запитів. Але dialog завжди йде через promise (`?promise=1`), тому кеш не повинен впливати. Реальна проблема — в `dialog-request-processor.ts`.

**Знайдені баги в `dialog-request-processor.ts`:**

### Баг 1: history береться з неправильного місця
```typescript
// ЗАРАЗ (неправильно):
const ctxContext = ctx['context'] as Record<string, unknown> | undefined;
const existingHistory = (ctxContext?.history ?? []) as ...
// ctx — це вже context, тому ctx['context'] = undefined завжди!

// ПРАВИЛЬНО:
const existingHistory = (ctx['history'] ?? []) as ...
```

### Баг 2: history не передається в наступний запит
Симуляція `dialog/3/response.json` показує: відповідь містить `context.history` з user+assistant.
Але `dialog/4/request.json` показує: наступний запит клієнта містить той самий `context.history`.
Тобто клієнт передає context з попередньої відповіді — це правильно.
Але сервер в `runResponseTransform` будує `newHistory` з `ctx` (поточний запит), а не з відповіді.

### Баг 3: подвійне додавання user message
В `server-transforms-request.json` (step 3) є `append-to-array` для user message.
В `runResponseTransform` також додається user message вручну.
Результат: user message дублюється.

**Правильна логіка (по симуляції):**
```
dialog/3: request має context.history=[] + result.message="hello world"
dialog/3: response має context.history=[{user,"hello world"},{assistant,"hello world"}]
dialog/4: request має context.history=[{user},{assistant}] + result.message="Дякую!"
dialog/4: response має context.history=[{user},{assistant},{user,"Дякую!"}]
```

Тобто: `newHistory = [...ctx.history, {user: result.message}, {assistant: llmMessage}]`

**Фікс:**
```typescript
// В runResponseTransform:
const existingHistory = (ctx['history'] ?? []) as Array<...>;  // НЕ ctx['context']
// Додавати user тільки якщо його ще немає в history (або не додавати тут взагалі — 
// якщо server-transforms-request.json вже це робить через append-to-array)
```

**Питання:** хто додає user message в history — transform pipeline чи код?
- `server-transforms-request.json` має `append-to-array` → але це для файлу `request.md`, не для відповіді
- `runResponseTransform` додає вручну → це і є джерело

**Рішення:** довіряти тільки одному місцю. Прибрати дублювання.

---

## ISSUE 3 — Coder: перевірка формату симуляції

**Статус:** потребує аудиту

**Проблема:** симуляція `coder` може мати застарілий формат.

**Спостереження по симуляції:**
- `coder/1`: `{ task: "..." }` → відповідь з `execute.form.choices` (router) ✓ відповідає поточному коду
- `coder/2`: `{ context, result.choice: "coder" }` → відповідь з `context.execution.action="coder"` + `execute.form` ✓
- `coder/3+`: містять `server-transforms-request.json` — потребує перевірки чи `coder` зареєстрований в `ACTION_TO_SCHEMA`

**Що перевірити:**
- `ACTION_TO_SCHEMA` в `dialog-request-processor.ts` містить `coder: 'coder'` ✓
- Чи є `prompts/transforms/coder/` директорія з `request.json` і `response.json`
- Чи відповідає формат transforms поточному `runPromptsTransform`

**Дії:**
1. Перевірити `a2a-server/prompts/transforms/` структуру
2. Порівняти `coder/2/response.json` з тим що реально повертає сервер при `result.choice="coder"`
3. Крок `coder/2` — сервер повинен повернути форму, але зараз `determineRequestType` для `result.choice` → йде в `action` процесор, не в `dialog`

**Потенційний баг:** `result.choice = "coder"` не обробляється як dialog step — немає `execution.action` в request, тому `determineRequestType` не розпізнає як `dialog`.

---

## ISSUE 4 — Тотальний аудит симуляцій

**Статус:** заплановано

**Проблема:** в симуляціях є місця де дані були прості, потім стали складними (через LLM transforms), і тепер `server-transforms-response.json` містить операції типу `parse-json-from-md` які важко відтворити без нейронки.

**Категорії проблем:**

### 4a. Відсутні `server-response.json` в dialog
`simulations/dialog/` не має `server-response.json` на рівні директорії (є тільки в підпапках).
Але `simulations/coder/server-response.json` є — це "загальний" приклад.

### 4b. `parse-json-from-md` залежить від LLM output
`dialog/3/server-transforms-response.json`:
```json
{ "op": "parse-json-from-md", "fromFile": "response.md" }
```
`response.md` генерується LLM → в тестах потрібен mock або fixture.

### 4c. Невідповідність форматів між старими і новими симуляціями
- Старі: `{ task: "..." }` без `context`
- Нові: `{ context: { execution: { action, step } }, result: {...} }`
- Деякі симуляції мають обидва формати в різних кроках

**Дії:**
1. Пройтись по всіх симуляціях і скласти таблицю: які кроки мають `server-transforms-*`, які ні
2. Для кроків з `parse-json-from-md` — додати fixture `response.md` в папку кроку
3. Перевірити `sim-validate.ts` — чи він перевіряє наявність fixtures

---

## ISSUE 5 — Coder Smart: переробка концепту (без state machine)

**Статус:** потребує переробки симуляції і підходу

**Рішення: відмовитись від state machine** — замість явного `execution.step` переходи між кроками визначаються виключно через схеми трансформацій (`server-transforms-request.json` / `server-transforms-response.json`). Сервер не знає "в якому кроці" він знаходиться — він просто застосовує transforms і повертає наступний `execute`.

**Проблеми поточної симуляції:**
1. Немає пагінації результатів `rag-search` — якщо результатів багато, контекст переповнюється
2. `docVirtual` накопичується без обмежень → проблема токенів (перетинається з ISSUE 6)
3. Кроки 6-9 не перевірені на відповідність коду
4. `execute.rag-search` не має схеми — клієнт не знає як обробляти

**Новий підхід — transform-driven flow:**
- Кожен крок визначається тільки через `server-transforms-*.json` файли
- `execute` команда наступного кроку генерується LLM через transform, не хардкодиться
- `docVirtual` — структурований контекст з обмеженням розміру секцій
- `rag-search` результати — пагіновані, клієнт передає `result.rag-search.page`

**Що потрібно зробити:**
1. Створити нову симуляцію `coder-smart-v2` з новими кроками по оптимізації контексту
2. Додати пагінацію в `execute.rag-search`: `{ query, page, pageSize }` → `result.rag-search: { items, total, page, hasMore }`
3. Визначити схему transforms для кожного кроку (без явного `execution.step` в коді)
4. `docVirtual` секції — обмежити розмір через transform операцію `truncate-section`
5. Додати `coder-smart` в `ACTION_TO_SCHEMA` після фіналізації нової симуляції

**Порядок роботи:**
```
1. Спроектувати нову симуляцію coder-smart-v2 (кроки + request/response JSON)
2. Визначити transforms для кожного кроку
3. Реалізувати нові transform операції якщо потрібно
4. Перевірити що старий coder-smart можна видалити або залишити як legacy
```

---

## ISSUE 6 — Оптимізація context між запитами

**Статус:** концепція, потребує дизайну

**Проблема:** при довгих діалогах `context.history` росте необмежено → токени.

**Варіанти:**

### 6a. Sliding window
Зберігати тільки останні N повідомлень в history. Просто, але втрачає ранній контекст.

### 6b. LLM-компресія (краще)
Після кожних K повідомлень: LLM стискає history в короткий summary.
```
history[0..K] → LLM → summary string
context.historySummary = summary
context.history = history[K..] (тільки свіжі)
```

### 6c. Structured context (для coder-smart)
Замість raw history — структурований `docVirtual`:
- `section1`: оригінальний запит
- `section2`: уточнена формулювання
- `section3`: план
- `section4`: чеклист
Це вже реалізовано в coder-smart симуляції — правильний підхід.

**Рекомендація:** для dialog — sliding window (останні 10 повідомлень). Для coder-smart — docVirtual вже є.

**Де реалізувати:** в `runResponseTransform` або окремий `context-optimizer.ts`.

---

## ISSUE 7 — Симуляції як golden standard

**Статус:** постійна задача

**Принципи (з ADR-0001, ADR-0020):**
- Симуляція = єдине джерело правди для поведінки системи
- Код повинен відповідати симуляції, не навпаки
- Якщо симуляція застаріла — спочатку оновити симуляцію, потім код

**Поточні проблеми:**
1. `dialog` симуляція не має `server-response.json` (загальний) — є тільки покрокові
2. `coder-smart` кроки 6-9 є в папках але не перевірені на відповідність коду
3. `fix-vue-imports` — невідомо чи ще відповідає поточному коду після рефакторингу

**Порядок роботи з симуляціями:**
```
1. Прочитати симуляцію (всі кроки)
2. Визначити які transforms потрібні
3. Перевірити чи transforms існують в prompts/transforms/
4. Написати/виправити код
5. Запустити: node a2a-server/scripts/run-simulation.ts <name>
6. Порівняти output з response.json кожного кроку
```

---

## ISSUE 8 — Agent mode: system role і tool use

**Статус:** заплановано

**Проблема:** dialog реалізований, але для повноцінного агентного режиму (coder, coder-smart) не вистачає:
1. `system` повідомлення не передається в LLM для coder — тільки user/assistant history
2. `a2a-client` і Web UI не адаптовані до повного agent mode: немає відображення tool calls, немає обробки проміжних `execute` команд крім `form`
3. Dialog не використовує tools (function calling) — LLM не може викликати зовнішні функції

**Деталі:**

### 8a. System role для coder
Coder потребує system prompt з інструкціями (роль, обмеження, формат відповіді).
Зараз system не передається → LLM не знає контексту агента.
- Додати `system` поле в transform schema для coder
- Передавати через `buildMessages([{role:"system", content}, ...history])`

### 8b. a2a-client і Web UI — agent mode
Поточний стан: клієнт обробляє `execute.form` (показує форму) і `execute.script` (запускає скрипт).
Не обробляється:
- `execute.rag-search` — клієнт повинен виконати пошук і повернути результати
- `execute.write-file` — запис файлу
- Проміжні кроки агента без user interaction (автоматичний цикл)
Web UI не показує tool calls і проміжні відповіді агента.

### 8c. Tool use (function calling)
Dialog зараз: user → LLM → assistant text → відповідь.
Потрібно: LLM може викликати tool → сервер виконує → результат повертається в LLM → фінальна відповідь.
- Визначити які tools потрібні (file-read, rag-search, write-file)
- Схема: `execute.tool-call` → клієнт виконує → `result.tool-result`
- Або: сервер сам виконує tools без участі клієнта (server-side tools)

**Рішення (рекомендоване):**
- Server-side tools для file operations (не потребують клієнта)
- Client-side tools тільки для того що сервер не може зробити (browser, UI interaction)
- Web UI: додати панель для відображення tool calls і agent steps

**Дії:**
1. Додати `system` в coder transforms і перевірити на симуляції
2. Визначити які execute команди клієнт повинен обробляти автоматично (без user input)
3. Спроектувати tool use схему в симуляції перед реалізацією
4. Web UI: мінімальне відображення agent steps (не блокує основний flow)

---

## Пріоритети виконання

| # | Задача | Блокує | Складність |
|---|--------|--------|------------|
| 2 | Фікс dialog history (ctx['context'] баг) | все | Low |
| 1 | Перевірка роутера / action registry | coder, coder-smart | Low |
| 3 | Аудит coder симуляції | coder покриття | Medium |
| 4 | Аудит всіх симуляцій | — | High |
| 5 | Coder-smart переробка симуляції (v2) | — | High |
| 6 | Context оптимізація | — | Medium |
| 8 | Agent mode: system role + tool use + client | coder, coder-smart | High |

**Починати з ISSUE 2** — це критичний баг який ламає весь dialog flow.
