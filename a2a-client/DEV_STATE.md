# DEV_STATE - A2A Client

## Архитектура

### Подсистемы проекта

Подсистемы проекта описаны в общем [`DEV_STATE.md`](../DEV_STATE.md).

### Daemons

- **Web**: DialogLoader (min 5s), DialogPromise poll → Client API
- **Client API**: PollingDaemon → A2A Server
- **A2A Server**: Request processor tick, LLM-ready poll
- **AI Integration**: Promise completion worker

См. полную документацию: [`docs/architecture/COMPONENT_ROLES.md`](docs/architecture/COMPONENT_ROLES.md)

### Общая архитектура системы

Общая архитектура системы описана в [`DEV_STATE.md`](../DEV_STATE.md).

### Polling Flow

```
Browser → Client API → A2A Server → AI Hub → Ollama
              ↑
         PollingDaemon
```

## Документация

### Основная
- [ARCHITECTURE_UPGRADE_PLAN.md](ARCHITECTURE_UPGRADE_PLAN.md) - План модернизации
- [docs/architecture/COMPONENT_ROLES.md](docs/architecture/COMPONENT_ROLES.md) - Роли компонентов
- [docs/README.md](docs/README.md) - Общая документация

### ADR (Architecture Decision Records)
- [docs/architecture/adr/README.md](docs/architecture/adr/README.md) - Индекс ADR

### API
- [docs/CLIENT_API_WEB_SDK.md](docs/CLIENT_API_WEB_SDK.md) - Web SDK
- [docs/SESSION-STORAGE.md](docs/SESSION-STORAGE.md) - Хранение сессий

### Поведение
- [docs/LOADER-BEHAVIOR.md](docs/LOADER-BEHAVIOR.md) - Поведение лоадера
- [docs/DIALOG-FRONTEND.md](docs/DIALOG-FRONTEND.md) - Диалоговый фронтенд

## Мониторинг

### Daemon Stats
- `GET /api/a2a/daemon/stats` - Статистика PollingDaemon

## Известные баги

(Обновить при необходимости)

---

Обновлено: 2026-03-24
