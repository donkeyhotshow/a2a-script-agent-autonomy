# A2A Script Agent Glossary

| Term | Definition |
|------|-----------|
| **A2A (Agent-to-Agent)** | Protocol linking specialized agents through unified request/response structure and shared context |
| **Agent** | Autonomous component executing specific task (code analysis, proxying, testing, etc.) |
| **Session** | Logical chain of operations/messages between client and server; stores `context`, `execute`, `messages`, `stepNum` |
| **Promise/promiseId** | Async request identifier for polling status/result via `/api/v1/requests/{promiseId}/result` |
| **Action/Execute/Result** | Structured objects: `execute` from server (form/action/message), client responds `result`, action specifies operation |
| **Step storage** | Step folders in `a2a-client/storage/sessions/{sessionId}/{step}/` with `request-to-server.json`, `server-response.json`, `server-promise.json`, `messages.json` |
| **Auto mode** | Behavior when `execute` requires no user input (no form.input/form.choices); UI creates system messages and can continue automatically |
| **Workbench** | Structured state in `context.workbench.sections` |
| **Action-Key Shape** | Single action type per execute/result: `{ "execute": { "script": {...} } }` |
| **Black Room** | Черная комната: финальная фаза обработки, где формируется окончательный ответ клиенту после выполнения всех операций |
| **Gray Room** | Серая комната: серверная цепочка LLM-вызовов (compress_history, thinking, auto_rag_page, auto_read_file, clarify) перед возвратом клиенту |
| **Red Room** | Красная комната: фаза выполнения инструментов клиентом (read-file, list-directory, file-exists и т.д.) после принятия решения в Gray Room |
| **Self-Upgrade** | Самоапгрейд: процесс самоулучшения системы через API-диалог (не прямое исполнение). Ключевое различие: агент не выполняет задачи самостоятельно, а направляет их через Client API (`/api/a2a/sessions`, `/next`, `/async`), управляя системой извне. Это создает контролируемый цикл: (1) агент анализирует кодовую базу, (2) формулирует задачи, (3) отправляет через API, (4) получает ответы, (5) корректирует. В dev-режиме проект целится сам на себя (a2a-client → a2a-script-agent), но архитектура позволяет работать с любым проектом. Граница: API-вызовы разделяют "анализирующий" и "исполняющий" контексты |
| **Router** | Keyword-based routing (dialog/agent/task-decomposition) |
| **Sync Mode** | Immediate execute response (no promiseId) |
| **Task Monitor** | `monitor-and-process-tasks.js` — автоматизированный скрипт обработки очереди задач. Должен отправлять запросы в сессии через Client API (`POST /api/a2a/sessions/{id}/next` + `GET /api/a2a/sessions/{id}/async`) для ведения многошагового диалога в режиме агента. Требует правильной обработки router-диалога (Beat A/B): определение `form.choices` и отправка либо `message`, либо `choice` в зависимости от ответа сервера. Задачи выполняются итеративно через цикл next+poll до завершения |
| **MONITOR-QUICK-START** | Root operator doc `MONITOR-QUICK-START.md`: run commands, `TASK_MONITOR_*` env, session-dialog contract (same as web UI), state/hooks, failures → `scripts/direct-tests` via ErrorClassifier |
| **Web DTO** | Client-sanitized execute (form only, not raw tool calls) |
| **Session Cleanup** | Удаление всех файлов в `C:\workspace\org-carrier\a2a-script-agent\a2a-client\storage\sessions` и `C:\workspace\org-carrier\a2a-script-agent\ai-integration\proxy_logs\**\*` для полной очистки состояния системы |
| **ErrorClassifier** | Система классификации ошибок в `tests/monitor-tasks/errors.js`. Распознает 30+ типов ошибок (connection, http, schema, llm, session, router, task, gray-room, filesystem, network, parse, async). Для каждой ошибки: severity (critical/high/medium/low), hint, quick fix, direct test command, diagnostic steps, environment diagnostic. Поддерживает генерацию PowerShell скриптов для диагностики |
| **Direct Tests** | Набор скриптов в `scripts/direct-tests/` для диагностики проблем без запуска полного стека: `run-checks.ps1`, `test-dialog-flow.ps1`, `dialog/run-dialog-direct-ollama.ps1`. Task Monitor автоматически предлагает релевантные direct tests при ошибках |
| **Task Monitor Modules** | Модульная архитектура: `task-monitor-core.js` (конфигурация, состояние, логирование), `task-monitor-api.js` (Client API вызовы), `task-monitor-processing.js` (обработка задач), `task-monitor-daemon.js` (daemon режим), `task-monitor-utils.js` (утилиты), `task-monitor-validation.js` (валидация), `errors.js` (классификация ошибок) |
