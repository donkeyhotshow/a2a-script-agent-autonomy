# Methodology: Папа — Мама (Papa–Mama)

Two buckets for **reliable** checks without mixing “is the port up?” with “does the contract hold?” or “does the full stack answer a real request?”.

| Role | Folder (normative home) | What goes here |
|------|-------------------------|----------------|
| **Папа (Papa) — API contour** | [`tests/direct-tests/`](tests/direct-tests/) | Тесты **через тот же контур, что и оператор/UI**: Client API (`/api/a2a/…`), сессии `create` / `next` / `async`, E2E-раннеры, hub reachability. Failures = проводка, рантайм, контракт «на проводе» у внешнего API. |
| **Мама (Mama) — глубина и оффлайн** | [`tests/indirect-tests/`](tests/indirect-tests/) + [`tests/proba-servera/`](tests/proba-servera/) | **Оффлайн:** валидаторы по JSON/MD, `sim:lint` / `sim:check-md`, Vitest по схеме, red/gray room. **Глубина (invoke):** [`tests/proba-servera/`](tests/proba-servera/) — in-process `invoke()` → **`promiseId`**, затем опрос до терминала (как live stack), сравнение **структуры ключей** `{ context, execute }` с `expected.json`. Поднятый `:3000` **не нужен** для in-process. Опционально: `PROBA_SERVERA_USE_HTTP=1` — `fetch` к `/api/v1/invoke` + poll `…/result`. Запуск: `npm run validate:proba-servera`. При падении — `error-report.md` в папке кейса. |

**Коротко:** Папа бьёт по **публичному API-контуру** (как клиент). Мама в **глубине** проверяет контракт invoke и статику; `proba-servera` обходит HTTP и гоняет тот же код, что маршрут `/invoke`.

## Metaphor: «Папа и мама поехали на дачу» (*Parents went to the dacha*)

Folk image: parents say they went to the **dacha** (away, casual); in reality they are **at work**; kids stay home on **remote** and keep things running; an outsider may **not know** which story is true.

**In this repo** the same shape is a warning about **narrative vs evidence**:

- **Папа и Мама are sequential, not interchangeable.** The Gang runs **Mama first**, then **Papa only if the stack is up** ([`tests/papa-mama-gang.mjs`](tests/papa-mama-gang.mjs), `npm run test:gang`). Green Mama output does **not** prove Papa ran or that HTTP + LLM paths were exercised.
- **«Дети дома»** maps to offline automation: indirect validators, agents editing from files, CI that skips live ports. Useful — but **different visibility** than Papa on the wire.
- **Authoritative plan lives in state docs**, not in chat tone: root and module [`DEV_STATE.md`](DEV_STATE.md), [`tasks/pending/`](tasks/pending/). Intended arc: **plan / scope** → **expand coverage** → **all relevant checks** → stop when the **whole** pipeline is actually satisfactory — not when one layer “sounds done.”
- **Anti-pattern (*на дачу*):** treating “Mama green” or a vague “all good” as closure **without** reconciling which Gang shift ran and whether `DEV_STATE` / tasks match reality.

Normative idle/queue behavior (prune → discover → write; do not stop on empty queue) stays in [`AGENTS.md`](AGENTS.md) (*Empty queue*, *DEV_STATE Protocol*).

## Mama: Red room vs Gray room (vertical vs horizontal)

Both are **validation-only** (Mama). Papa **executes** the live stack; Mama **checks** captured or synthetic JSON against a contract.

| Metaphor | Axis | What is validated | Typical artifact |
|----------|------|-------------------|------------------|
| **Red room** | **Vertical** | Ordered **dialog / session** flow: step 1 → 2 → … (router, choices, forms, execution step) | Per-step `server-response.json` (or session export) + [`mama-red` spec](tests/indirect-tests/red-room/README.md) |
| **Gray room** | **Horizontal** | Ordered **interrupt chain** inside one server turn: `compress_history`, `thinking`, `auto_read_file`, … | `context.workbench.slots.interruptTrace` + [`mama-gray` spec](tests/indirect-tests/gray-room/README.md) |

Implementations: [`validate-red-room-dialog-vertical.mjs`](tests/indirect-tests/red-room/validate-red-room-dialog-vertical.mjs), [`validate-gray-room-horizontal.mjs`](tests/indirect-tests/gray-room/validate-gray-room-horizontal.mjs). Examples run as part of `npm run test:indirect`.

**Naming collision:** `e2e-dialog-test.js` uses `red-room` for a **small** client stub (tool `/next` only). The methodology “red room = vertical dialog Mama” is the **session-column** checker above.

## Why split

- **Direct** tests are flaky when the model is slow, ports clash, or CI has no stack — they should not run automatically on every `start-all.bat`.
- **Indirect** tests should be fast and deterministic; run them in PRs and before deep debugging.

## Operational flow: Papa & Mama Gang

Чтобы не запускать скрипты по отдельности, Папа и Мама объединились в "Банду" (Gang Orchestrator). Единый скрипт берет под контроль тесты всех приложений проекта, распределяя их по сменам.

### Философия Банды (Zero Trust)

**Если `tests/papa-mama-gang.mjs` говорит, что всё чётко и проблем нет — ЭТО НЕПРАВДА.**

- **Нет проблем = ищи проблемы.** Зеленый выхлоп скрипта означает лишь то, что старые дыры закрыты.
- **Нашел проблему? Улучши скрипт.** Не нужно просто писать пользователю в чат "я нашел ошибку" (не впаривай). Нужно написать автоматический тест (для Мамы или Папы), который будет падать и показывать эту ошибку.
- **Мы злопамятные:** Все потенциальные точки отказа должны "считаться на входе" (строгая валидация).
- **Цель:** Абсолютная целостность проекта, при которой "магия происходит так быстро, что все пукан рвут".

**Запуск всей банды:**
```bash
npm run test:gang
```

**Ориентационный хук (сессия после зелёной банды):** при живом Client API (`:5173`) и сервере (`:3000`) создаётся сессия `mode: agent` с задачей «прочитать DEV_STATE везде, tasks, AGENTS — продолжить работу». Отдельно: `npm run gang:orient-session`. Вместе с бандой: `GANG_ORIENT_SESSION=1 npm run test:gang` (Windows PowerShell: `$env:GANG_ORIENT_SESSION='1'; npm run test:gang`). Если стек выключен — печатается тот же текст задачи для вставки в IDE.

Скрипт [`tests/papa-mama-gang.mjs`](../tests/papa-mama-gang.mjs) в начале печатает блок **«знакомство смен»**: что именно входит в `test:indirect` (полный `run-all.mjs`, включая gray fixtures, sticky-router audit, audit execute shape по симуляциям), что делает Папа при живом `:3000`, и отсылает сюда — чтобы не крутить «дела без крыши».

**Как это работает (`tests/papa-mama-gang.mjs`):**

1. **Смена Мамы (Mama Shift):**
   - Запускает `test:indirect` (все оффлайн проверки, схемы, фикстуры).
   - Запускает юнит-тесты сервера (`test:server:unit`).
   - Запускает юнит-тесты клиента.
   - Запускает валидацию симуляций (`sim:validate`).
   - *Если Мама находит ошибку, смена Папы даже не начинается.*

2. **Смена Папы (Papa Shift):**
   - Проверяет, запущен ли живой стек (`http://localhost:3000/health`).
   - Если стек жив — `e2e-dialog-test.js` (с флагом `E2E_DIRECT_LOW_LLM=1` для экономии токенов): Client API / сессии / LLM.
   - **Proba-servera** уже в смене Мамы (in-process invoke, без HTTP).

Если вам нужно запустить их по отдельности:

1. **Mama first (before starting stack):**
   ```powershell
   # Fast static checks — no Ollama, no ports, no stack
   node tests/indirect-tests/run-all.mjs
   .\tests\indirect-tests\run-server-unit-tests.ps1
   ```
   If these fail, fix before starting the stack.

2. **Start stack:** `start-all.bat` (services only; no test suite).

3. **Papa (when you need “it really talks”):**
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\tests\direct-tests\run-post-start-all.ps1
   # Or subset: node tests/direct-tests/e2e-dialog-test.js --only=routerAgentNoLoop
   ```
   See [`tests/direct-tests/README.md`](tests/direct-tests/README.md).

## Invoke structure (Mama depth, in-process)

| Script | Checks | Typical failure |
|--------|--------|---------------|
| `npm run validate:proba-servera` | Per-case `input.json` → `invoke()` → poll `promiseId` to terminal → key tree vs `expected.json` | Wrong `execute` action key, missing `workbench`, router shape drift |

## Indirect test inventory (Mama)

| Script | Checks | Typical failure |
|--------|--------|---------------|
| `run-all.mjs` | All validators below + summary | Any static error |
| `validate-action-registry.mjs` | Action folders have handler.ts, schema.ts, registry references | Registry out of sync |
| `validate-request-schemas.mjs` | JSON schemas in docs/new-request-flow/ | Schema drift |
| `validate-import-extensions.mjs` | Relative imports use `.js` (NodeNext) | Runtime import errors |
| `validate-prompts.mjs` | Prompt files have balanced braces, structure | Template rendering bugs |
| `run-server-unit-tests.ps1` | a2a-server Vitest (mocked LLM) | Processor logic bugs |
| Red room vertical (in `run-all.mjs`) | Example fixture: dialog steps in order | Spec vs captured session shape |
| Gray room horizontal (in `run-all.mjs`) | Example fixture: `interruptTrace` handler order | Gray-room chain drift |

Full docs: [`tests/indirect-tests/README.md`](tests/indirect-tests/README.md).

## Migration note

Today, many indirect scripts still live under `tests/direct-tests/validators/`. **Mama** is the long-term home; move or wrap them here over time without breaking existing `npm run …` scripts until you update `package.json` on purpose.
