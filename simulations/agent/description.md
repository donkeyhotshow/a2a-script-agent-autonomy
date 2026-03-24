# Agent Mode Simulation

## Тип: Unified Agent

Единый агентный режим, который объединяет функциональность analyze, coder, auto-ai-v2 в одну универсальную систему.

## Опис

Симуляція демонструє універсальний агентний режим, де:

- **action** (який інструмент використовувати) — визначається LLM: `rag-search`, `read-file`, `write-file`, `execute-command`, `dialog`
- **step** (фаза роботи) — визначається LLM: `plan`, `analyze`, `execute`, `review`, `dialog`, `completed`
- **Переходи** — LLM вирішує що робити далі на основі контексту

## Структура симуляцій (варіації)

Один режим `agent/` — золотий стандарт, з варіаціями:

```
simulations/agent/           # Базовий скелет (router → agent)
simulations/agent-analyze/  # Варіант: Analyze flow
simulations/agent-coder/     # Варіант: Coder flow  
simulations/agent-auto-ai-v2/ # Варіант: Auto-AI v2 flow
```

Каждая вариация — полноценная симуляция с шагами.

## Матриця поглинання симуляцій

| Симуляція | Поглинання | Примітка |
|-----------|------------|----------|
| `analyze` | ✅ Так → `scenarios/analyze-flow/` | Фокус на `step: analyze` |
| `coder` | ✅ Так → `scenarios/coder-flow/` | Фокус на `step: execute` |
| `auto-ai` | ✅ Так | Базова версія |
| `auto-ai-v2` | ✅ Так → `scenarios/auto-ai-v2-flow/` | Повний цикл |
| `coder-smart` | ✅ Так | Включається в coder-flow |
| `coder-smart-v2` | ✅ Так | Включається в coder-flow |
| `dialog` | ❌ Ні | Окремий режим |
| `task-decomposition` | ❌ Ні | Окремий режим |
| `fix-vue-imports` | ❌ Ні | Scripted без LLM |

## Потік

| Крок | Client (Web→Client) | Server Response (Server→Client) | Received (Client→Web) |
|------|---------------------|--------------------------------|-----------------------|
| 1    | task: "допоможи з кодом" | execute.form з вибором agent | execute.form |
| 2    | result.choice: "agent" | execute.form запитує message | execute.form |
| 3    | result.message | LLM → plan step, rag-search | execute.rag-search |
| 4    | result["rag-search"] | LLM → analyze, read-file | execute.read-file |
| 5    | result["read-file"] | LLM → execute, write-file | execute.write-file |
| 6    | result["write-file"] | LLM → review, dialog | execute.dialog |
| 7    | result.message | LLM → completed | result.completed |

## Можливі дії (Actions)

1. **rag-search** — пошук за натуральним запитом
2. **read-file** — читання вмісту файлу
3. **write-file** — запис/модифікація файлу
4. **execute-command** — виконання команди
5. **dialog** — діалог з користувачем

## Можливі фази (Steps)

1. **plan** — розуміння задачі, планування підходу
2. **analyze** — пошук, читання, розуміння коду/документації
3. **execute** — написання коду, створення файлів
4. **review** — верифікація, тести, лінтинг
5. **dialog** — комунікація з користувачем
6. **completed** — задача завершена

## Логіка переходів

```
plan → analyze → execute → review → dialog → completed
       ↑         ↓
       ←         → (залежно від результату)
```

LLM вирішує:
1. Яку фазу (step) обрати
2. Яку дію (action) виконати
3. Продовжувати чи завершити

## Структура файлів

```
simulations/agent/
├── description.md
├── analysis.md
├── 1/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 2/
│   ├── client.json
│   ├── request.json
│   ├── response.json
│   └── received.json
├── 3/
│   ├── client.json
│   ├── request.json
│   ├── server-transforms-request.json
│   ├── request.md
│   ├── response.md
│   ├── server-transforms-response.json
│   ├── response.json
│   └── received.json
├── ...
└── N/
    ├── client.json
    ├── request.json
    ├── response.json
    └── received.json
```
