# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Project-Specific Information

### Configuration
- **JWT_SECRET requires 32+ characters** - Enforced by Zod validation in [`config/index.ts`](a2a-server/src/config/index.ts:19)
- **ENCRYPTION_KEY required for tests** - Must be exactly 32 characters, set in [`tests/setup.ts`](a2a-server/tests/setup.ts:16)
- **All config via environment variables** - Uses Zod schema validation with defaults in [`config/index.ts`](a2a-server/src/config/index.ts:9-63)

### Import Patterns
- **Use .js extension for path aliases** - Due to NodeNext module resolution in [`tsconfig.json`](a2a-server/tsconfig.json:4-5), imports like `import x from '@/services/x'` must use `.js` extension: `import x from '@/services/x.js'`

### Commands
```
bash
# a2a-server
cd a2a-server && npm run dev:no-auth      # Development without auth (SKIP_AUTH=1)
cd a2a-server && npx vitest run tests/unit/auth.controller.test.ts  # Run single test file
cd a2a-server && npx vitest run -t "test name"  # Run tests by name pattern

# a2a-client
cd a2a-client && npm run test:e2e         # E2E tests with Playwright
```

### qtu - Question to User (Интерактивные вопросы пользователю)
**ВАЖНО: Используйте `qtu` регулярно при неопределённости!** Это предотвращает ошибки в критических местах.

`qtu` - PowerShell скрипт для интерактивного задавания вопросов через веб-интерфейс. Запускает PHP сервер, открывает браузер и ожидает ответа пользователя.

**Когда использовать:**
- Не уверены в правильности выбора архитектурного решения
- Нужно уточнить требования у пользователя
- Есть несколько вариантов реализации и нужно выбрать оптимальный
- Требуется подтверждение перед деструктивными операциями (удаление файлов, изменение структуры)
- Необходимо получить дополнительные данные, которые нельзя вывести из контекста

**Использование:**
```
powershell
# Простой текстовый вопрос
powershell -ExecutionPolicy Bypass -File C:\workspace\bin\qtu.ps1 -Question "Ваш вопрос?"

# Вопрос с вариантами выбора (Свой вариант добавляется автоматически)
powershell -ExecutionPolicy Bypass -File C:\workspace\bin\qtu.ps1 -Question "Какой подход использовать?" -Options "Оптимизация памяти,Оптимизация скорости,Баланс"

# С указанием порта и таймаута
powershell -ExecutionPolicy Bypass -File C:\workspace\bin\qtu.ps1 -Question "Ваш вопрос?" -Port 9000 -Timeout 300
```

**Параметры:**
| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `-Question` | Текст вопроса (обязательный) | - |
| `-Options` | Варианты ответа через запятую | - |
| `-Port` | Порт PHP сервера | 8765 |
| `-Timeout` | Таймаут ожидания в секундах | 600 |
| `-Help` | Показать справку | - |

**Требования:**
- PHP должен быть установлен и доступен в PATH
- Браузер по умолчанию (Edge/Chrome/Firefox)

**Файлы:**
- `questions-to-user/questions.json` - все вопросы
- `questions-to-user/questions/q_xxx.json` - отдельный файл вопроса
- `questions-to-user/answers.json` - ответы пользователя

### Architecture Notes
- **Server does NOT store client data** - Graph is passed in context and returned in response; stateless design
- **PhaseMachine drives request flow** - State machine with phases: idle → discovery → recognition → analysis → action → validation → completed
- **ActionProcessor for no-AI mode** - Executes actions from MD definition files without AI calls
- **Request processor is timer-based** - Polls for pending requests every 5 seconds (configurable via REQUEST_PROCESSOR_INTERVAL_MS)
- **Client workspaces** - `agent`, `api-client`, `fs-utils`, `rag`, `script-runner` are separate npm packages under `a2a-client/packages/`

### Client vs Server (разделение ответственности)
- **Client:** Holds all codebase indexes (RAG, file search, free-form search). Stores history. Executes commands from server responses. Sends context back to server **without altering it** (only adds new inputs like `step_result`, `code_blocks`; does not modify graph/context returned by server).
- **Server:** Controls client via response payload. Receives context and **may modify it** (server can change context). Server does **not** store user code or codebase data. Server does **not** use caches to pass data between iterations (ContextManager is request-scoped; ActionExecutor keeps only execution state: step index, not file content). Server = logic + its own data only. **Actions** (definitions in `a2a-server/src/actions/definitions/`) are the main place for mechanical task decisions.
- **fileCachePath** (config): for server-owned assets (e.g. git clone dirs), not for caching user codebase; user code stays on client.
