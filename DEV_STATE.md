# DEV_STATE (2026-03-06)

> **Примечание:** Содержимое разделено по компонентам. Подробности см. в соответствующих файлах.

## Оглавление

### Основные компоненты

| Раздел | Файл | Описание |
|--------|------|----------|
| Клиентская часть | [a2a-client/DEV_STATE.md](a2a-client/DEV_STATE.md) | Web UI (5173), CLI, Client API (3001/3002) |
| Серверная часть | [a2a-server/DEV_STATE.md](a2a-server/DEV_STATE.md) | A2A Server (3000), нейроны |
| AI интеграция | [ai-integration/DEV_STATE.md](ai-integration/DEV_STATE.md) | Proxy (11435), встроенный демон, Ollama (11434) |

### Подкомпоненты a2a-client

| Компонент | Файл | Описание |
|-----------|------|----------|
| Web UI | [a2a-client/web/DEV_STATE.md](a2a-client/web/DEV_STATE.md) | **Unified Architecture**: SessionStore + TransportManager + PanelManager (legacy archived) |
| Embedding | [a2a-client/packages/embedding/DEV_STATE.md](a2a-client/packages/embedding/DEV_STATE.md) | Обработка эмбеддингов |
| Execution | [a2a-client/packages/execution/DEV_STATE.md](a2a-client/packages/execution/DEV_STATE.md) | Исполнение задач |
| History | [a2a-client/packages/history/DEV_STATE.md](a2a-client/packages/history/DEV_STATE.md) | Управление историей |
| JSON | [a2a-client/packages/json/DEV_STATE.md](a2a-client/packages/json/DEV_STATE.md) | JSON утилиты |
| RAG | [a2a-client/packages/rag/DEV_STATE.md](a2a-client/packages/rag/DEV_STATE.md) | Retrieval-Augmented Generation |
| SDK | [a2a-client/packages/sdk/DEV_STATE.md](a2a-client/packages/sdk/DEV_STATE.md) | Software Development Kit |
| Storage | [a2a-client/packages/storage/DEV_STATE.md](a2a-client/packages/storage/DEV_STATE.md) | Хранение данных |
| Types | [a2a-client/packages/types/DEV_STATE.md](a2a-client/packages/types/DEV_STATE.md) | TypeScript типы |

### Дополнительные компоненты

| Раздел | Файл | Описание |
|--------|------|----------|
| Документация | [docs/DEV_STATE.md](docs/DEV_STATE.md) | Архитектура, протоколы, руководства |
| Тесты | [tests/DEV_STATE.md](tests/DEV_STATE.md) | Unit, Integration, E2E тесты |
| Скрипты | [scripts/DEV_STATE.md](scripts/DEV_STATE.md) | Dev tools, генераторы кода, Web UI smoke test |
| Симуляции | [simulations/DEV_STATE.md](simulations/DEV_STATE.md) | Golden standard тестирования |
