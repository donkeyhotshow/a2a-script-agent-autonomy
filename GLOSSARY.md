# A2A Script Agent Glossary

Краткий справочник терминов, принятых в рамках A2A Script Agent.

| Термин | Значение |
|--------|----------|
| **A2A (Agent-to-Agent)** | Протокол, который связывает специализированные агенты через единую структуру запросов/ответов и общий контекст. |
| **Agent** | Автономный компонент, исполняющий конкретную задачу (анализ кода, проксирование, тестирование и т. п.). |
| **Session** | Логическая цепочка операций и сообщений между клиентом и сервером; хранит `context`, `execute`, `messages`, `stepNum`. |
| **Promise (promiseId)** | Идентификатор асинхронного запроса к A2A Server. Используется для polling статуса и результата асинхронного запроса к A2A Server через `/api/v1/requests/{promiseId}/result`. |
| **Action / Execute / Result** | Структурированные объекты: `execute` приходит от сервера (`form`, `action`, `message`), клиент отвечает `result`, а `action` задаёт конкретную операцию. |
| **Step storage** | Номера шагов в `a2a-client/storage/sessions/{sessionId}/{step}/` с файлами `request-to-server.json`, `server-response.json`, `server-promise.json`, `messages.json`. |
| **Auto mode** | Поведение, когда `execute` не требует пользовательского ввода (нет `form.input`/`form.choices`); UI создаёт системные сообщения и может продолжать автоматически. |

Общие понятия уточняются в `plans/api-client-server-logic.md` и соответствующем API-тестировании.
