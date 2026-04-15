# Product Overview

A2A Script Agent — автономная AI-рабочая станция оператора для AI-assisted разработки. Стек координирует долгоживущие async-сессии (Client API → A2A Server → AI Hub) через протокол `/next` + `/async`, а не одиночные HTTP-запросы к LLM.

## Core purpose

Autonomous operator workstation: multi-turn async agent sessions with evidence-first closure.

## Key workflows

1. **Agent session** — создать сессию (`mode: "agent"`), передать задачу, вызывать `/next` + поллить `/async` до terminal-состояния
2. **Task Monitor** — `npm run monitor` / `monitor:once` автоматически обрабатывает очередь `prompts-to-agent-mode/` через Client API
3. **Central orchestrator** — `npm run central` запускает полный offline-gate + один проход monitor:once
4. **Simulation validation** — `npm run sim:lint -- --all` + `sim:validate -- --all` проверяют golden-standard сценарии
5. **Offline gate** — `npm run test:before-start` (indirect + server unit + test:monitor + verify:audit-session-storage)

## Out of scope

- Синхронные invoke-пути (async-only transport — обязательное правило)
- Прямые вызовы LLM без promise queue
- Серверное хранение сессий (сессии хранятся только в Client API)
