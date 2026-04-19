# Agent OS — Theatrical Script Generator

A local, CLI-only **Agent Operating System** for generating theatrical scripts via an iterative multi-agent pipeline.

## Architecture

```
CLI (bootstrap.py)
   ↓
LangGraph Orchestrator (DAG)
   ↓
Workers: script_writer → critic → judge → formatter
   ↓
Blackboard (shared state)
   ↓
Memory Layer: Redis + JSON + SQLite
   ↓
artifacts/
```

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure

```bash
cp .env.example .env
# edit .env and set OPENAI_API_KEY
```

### 3. Run

```bash
python bootstrap.py run \
  --task "драматический монолог о предательстве" \
  --skill theatre-drama \
  --max-revisions 3
```

Output is saved to `artifacts/<task-id>.txt`.

### 4. Docker (with Redis)

```bash
docker compose up
```

## Project Structure

```
agent-os/
├── bootstrap.py              # CLI entry point
├── config/core.json          # Runtime config
├── core/                     # Logger, DI, error handler
├── infra/                    # Redis adapter, sandbox
├── features/
│   ├── orchestrator/graph.py # LangGraph DAG
│   ├── blackboard/board.py   # Shared state
│   ├── memory/manager.py     # 4-layer memory
│   └── skills/loader.py      # Skill loader + FAISS
├── adapters/workers/
│   ├── script_writer/        # Generates draft
│   ├── critic/               # Structural critique
│   ├── judge/                # Numeric score 0-10
│   └── formatter/            # Final formatting
├── extensions/               # agent-zero style hooks
├── skills/theatre-drama/     # Theatre skill definition
├── memory_store/             # solutions.json, behaviour.md
└── artifacts/                # Generated scripts
```

## Pipeline DAG

```
START → skill_retrieval → planner → writer → critic → judge
                                       ↑                 |
                                       |  score < 7.0    |
                                       +- (loop max 3x) -+
                                                         |
                                                    formatter → memory_save → END
```

## Configuration (`config/core.json`)

| Key | Default | Description |
|-----|---------|-------------|
| `max_revisions` | 3 | Max revision cycles |
| `judge_threshold` | 7.0 | Minimum score to pass |
| `redis_url` | `redis://localhost:6379/0` | Redis connection |
| `openai_model` | `gpt-4o-mini` | LLM model |

## Memory Layers

1. **SHORT TERM** — Redis (TTL-based key-value)
2. **SOLUTIONS** — `memory_store/solutions.json` (similar task lookup)
3. **BEHAVIOUR** — `memory_store/behaviour.md` (injected into system prompt)
4. **EPISODIC** — SQLite (`memory_store/episodic.db`)

## Core Principles

- **Stateless workers** — state only in `Task + Blackboard`
- **Async-first** — all I/O is async
- **LLM = reasoning only** — no LLM routing, validation, or deterministic transforms
- **No hidden magic** — everything is explicit: graph, state, memory
