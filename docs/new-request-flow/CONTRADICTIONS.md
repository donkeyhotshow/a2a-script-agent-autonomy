# Архив: противоречия в старых версиях доков

Исторически здесь фиксировали расхождения (например, кто формирует `execute.ui` — **Client API**, не A2A Server; опечатки в путях polling). **Актуальная модель** — только в:

- [PROTOCOL.md](PROTOCOL.md) — контракты, `promiseId`, эндпоинты
- [DATA-FLOW.md](DATA-FLOW.md) — слои Web → Client API → A2A Server → Hub
- [PROTOCOLS/states/](PROTOCOLS/states/README.md) — состояния async / UI

Этот файл оставлен как якорь для старых ссылок; новые материалы сюда не добавляем — правьте канон выше.
