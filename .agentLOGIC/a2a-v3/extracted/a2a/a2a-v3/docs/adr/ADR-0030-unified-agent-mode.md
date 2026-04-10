# ADR-0030: Unified Agent Mode

## Статус

**Accepted** (Принят)

## Контекст

### Проблема

Ранее система содержала множество отдельных режимов: `analyze`, `coder`, `auto-ai-v2`, `coder-smart-v2`. Каждый режим требовал отдельного промпта и симуляции, что приводило к:
- Дублированию кода и логики
- Сложности поддержки
- Невозможности динамического переключения между режимами

### Решение

Единый режим `agent`, где:
- **context.execution.action** — всегда `agent`
- **context.execution.step** — фаза работы: `plan`, `analyze`, `execute`, `review`, `completed`
- **execute** — конкретное действие (инструмент): `rag-search`, `read-file`, `write-file`, `execute-command`, `dialog`, `form`, `script`

LLM динамически определяет последовательность шагов и инструментов на основе входящей задачи.

### Структура симуляций

Один режим `agent` с вариациями для тестирования различных сценариев:

```
simulations/agent-analyze/       # Тест: анализ кода
simulations/agent-coder/          # Тест: генерация кода
simulations/agent-auto-ai/       # Тест: полный цикл (базовый сценарий)
simulations/agent-coder-smart/   # Тест: умное кодирование
```

Это НЕ отдельные режимы, а тестовые вариации ОДНОГО агентного режима для проверки различных пользовательских сценариев.

### Примеры переходов

**Сценарий 1: Анализ**
```
context.execution.action: "agent"
context.execution.step: "plan"
execute: { "rag-search": { query: "architecture documentation" } }
```
→ result →
```
context.execution.step: "analyze"
execute: { "read-file": { path: "ARCHITECTURE.md" } }
```
→ result →
```
context.execution.step: "review"
execute: { "dialog": { message: "Вот анализ..." } }
```
→ completed

**Сценарий 2: Генерация кода**
```
context.execution.action: "agent"
context.execution.step: "plan"
execute: { "rag-search": { query: "express routes" } }
```
→ result →
```
context.execution.step: "execute"
execute: { "write-file": { path: "src/routes/health.ts" } }
```
→ result →
```
context.execution.step: "review"
execute: { "execute-command": { command: "npm run dev" } }
```
→ completed

## Последствия

### Положительные

- **Упрощение**: один режим вместо 4+ отдельных
- **Гибкость**: agent динамически адаптируется к задаче
- **Единая точка входа**: один промпт для всех сценариев
- **Масштабируемость**: легко добавить новые инструменты/шаги

### Отрицательные

- **Сложность LLM промпта**: нужно научить LLM правильно переключаться между шагами
- **Меньше предсказуемость**: режим не гарантирует определенную последовательность

## Связанные ADR

- [ADR-0026](./ADR-0026-server-llm-request-prep.md) — Server LLM request prep
- [ADR-0029](./ADR-0029-server-interrupt-loop.md) — Server interrupt loop
