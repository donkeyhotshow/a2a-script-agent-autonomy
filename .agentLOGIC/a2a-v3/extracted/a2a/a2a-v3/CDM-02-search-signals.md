# CDM-02: Сигналы поиска

## 1. Дублирующие адаптеры

### Паттерн: Множественные HTTP клиенты

**Критерии поиска:**
- Файлы с `import fetch from 'node-fetch'` (устаревший)
- Файлы с `import axios from 'axios'`
- Файлы с нативным `fetch` (современный)
- Файлы с `http.request` / `https.request`

**Примеры файлов:**
| Модуль | Файл | Текущий HTTP клиент |
|--------|------|---------------------|
| **a2a-client/tester/** | `tester/cli.js` | node-fetch |
| | `tester/tests/sessions.js` | node-fetch |
| | `tester/tests/performance.js` | node-fetch |
| | `tester/tests/panels.js` | node-fetch |
| | `tester/tests/commands.js` | node-fetch |
| **a2a-client/vite-plugin-a2a/** | `routes/utils/agent-rag-chain.js` | http.request |
| | `routes/proxy/a2a-proxy.js` | нативный fetch |
| **a2a-server/** | — | (использует axios в ai-integration) |

**Рекомендация:**
- Унифицировать на нативный `fetch` (ESM стандарт)
- Перенести node-fetch из tester в shared-пакет

---

### Паттерн: Множественные конфигурационные загрузчики

**Критерии поиска:**
- Поиск `.env`, `process.env`, `loadConfig`, `dotenv`
- Файлы с ручной загрузкой JSON конфигов

**Примеры файлов:**
| Модуль | Файл | Тип конфига |
|--------|------|-------------|
| **a2a-client/** | `shared/a2a-server-base.js` | process.env |
| | `scripts/cleanup-sessions.js` | process.env |
| | `vite.config.js` | process.env |
| | `vite-plugin-a2a/storage/root.js` | process.env |
| **a2a-server/** | `src/config/index.ts` | zod + env (централизованный) |

**Рекомендация:**
- a2a-client: централизовать конфиг в `shared/`
- Убрать разрозненные `process.env` обращения

---

### Паттерн: Множественные логгеры

**Критерии поиска:**
- `console.log/error/warn` в продакшн коде
- Winston/другие библиотеки
- Наличие кастомных обёрток

**Примеры файлов:**
| Модуль | Файл | Статус |
|--------|------|--------|
| **a2a-server/** | `src/utils/logger.ts` | Winston (централизован) ✅ |
| **a2a-client/** | `web/js/*` | console.* (хаотично) |
| | `packages/types/src/types.js` | console.warn |
| | `vite-plugin-a2a/routes/actions.js` | console.error |

**Рекомендация:**
- Убрать `console.*` из a2a-client/web/js/
- Использовать централизованный логгер из vite-plugin-a2a

---

## 2. Legacy bridges

### Паттерн: Файлы с маркерами устаревания

**Критерии поиска:**
- Имя файла: `legacy`, `old`, `deprecated`, `v1`
- JSDoc: `@deprecated`
- Комментарии: `// deprecated`, `// legacy`

**Примеры файлов:**
| Модуль | Файл | Маркер |
|--------|------|--------|
| **a2a-client/** | `vite-plugin-a2a/storage/newSessions.js:215-217` | @deprecated (JSDoc) |
| | `packages/types/src/types.js:240-242` | @deprecated (LEGACY_SESSION_STATUS) |
| | `vite-plugin-a2a/routes/handlers/step-handlers.js:56-62` | @deprecated (POST /steps) |
| | `web/js/task-flow/tasks.js:280` | legacy comment (Vite vs SDK response) |
| **a2a-server/** | `src/routes/sessions.routes.ts:9` | legacy comment |
| | `src/services/core/request-processor/validators/transform-execute-validator.ts:143-154` | legacy bare blob |

**Рекомендация:**
- Пометить в DEV_STATE с датой удаления
- Создать миграционный план legacy → new

---

### Паттерн: Bridges между старыми и новыми системами

**Критерии поиска:**
- Функции-мостики `convertLegacyToNew`, `transformOldFormat`
- Проверки версий/форматов
- Обработка fallback на старые пути

**Примеры:**
- `newSessions.js:261` — `legacyFile = path.join(stepDir, 'step.json')`
- `transform-execute-validator.ts:144` — проверка legacy bare blob формата

**Рекомендация:**
- Добавить в DEV_STATE как технический долг
- Установить deadline на удаление bridge-кода

---

## 3. Dead exports

### Паттерн: Неиспользуемые экспорты

**Критерии поиска:**
- `export function/class/const` в файле, который не импортируется
- Экспорты без импортов в других модулях
- "Тупиковые" модули (ничего не экспортируют наружу)

**Примеры файлов (требуют проверки):**

| Модуль | Директория | Примечание |
|--------|------------|------------|
| **a2a-client/scripts/** | `cleanup-sessions.js` | Скрипт — не используется в CI/CD? |
| **a2a-client/debug-console.js** | — | Только для dev mode |
| **a2a-server/scripts/** | 18 файлов | Связаны с симуляциями — проверить использование |
| **ai-integration/scripts/** | 11 файлов | Часть уже устарела (cleanup*.py) |

**Рекомендация:**
- Использовать `npm run sim:lint -- --all --json` для проверки симуляций
- Проверить scripts/ на наличие в package.json → scripts
- Удалить неиспользуемые скрипты из a2a-server/scripts/

---

### Паттерн: "Тупиковые" модули

**Критерии поиска:**
- Модуль экспортирует, но никем не импортируется
- Тесты есть, но основной код не используется

**Области для проверки:**

| Модуль | Директория | Проверить |
|--------|------------|-----------|
| **a2a-client/tester/** | — | Может быть заменён на playwright тесты |
| **a2a-client/scripts/** | — | Одинокие скрипты без вызовов |
| **a2a-server/daemon/** | — | Проверить, запускается ли |
| **ai-integration/scripts/** | — | cleanup*.py — потенциально дубликаты |

---

## Резюме проверок по модулям

| Модуль | Зона | Сигналы |
|--------|------|---------|
| **a2a-client** | tester/ | node-fetch (дубликат), потенциально dead |
| | scripts/ | dead exports (cleanup-sessions.js) |
| | debug-console.js | только dev, не для продакшн |
| **a2a-server** | scripts/ | 18 файлов — проверить использование |
| | daemon/ | проверить запускаемость |
| | middleware/ | проверить неиспользуемые |
| | repositories/ | проверить dead exports |
| **ai-integration** | scripts/ | 11 файлов, есть дубликаты (cleanup*.py) |
| | proxy/cleanup.py vs scripts/cleanup*.py | дублирующая функциональность |

---

## Следующие шаги (CDM-03)

1. **Создать скрипт анализа** — автоматическое определение dead exports
2. **Проверить импорты** — для каждого модуля проверить, кто его импортирует
3. **Анализ package.json** — какие scripts реально вызываются
4. **Определить даты удаления** — для legacy с @deprecated