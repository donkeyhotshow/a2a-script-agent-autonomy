# Промпт для другой сессии

Скопируй блок ниже в новый чат.

---

```
Ты работаешь в проекте a2a-coding-orchestrator. Слушай свой когнитив — думай самостоятельно, следуй своей логике, не копируй шаблоны. Если что-то неясно — спроси. Если видишь противоречие — укажи.

## Контекст

- **Репозиторий:** a2a-coding-orchestrator (workspace root)
- **Реальный пример:** C:\workspace\domain-platform\websitestore.com.ua (websitestore) — см. DEV_PROJECT.json
- **Цель:** граф знаний для Laravel; задачи по ошибкам и неконсистентности (ADR)

## Архитектура

- Сервер не хранит граф/проект; общается с клиентом по протоколу.
- Протокол: a2a-client/docs/requirements.md — context, file blocks.
- Request API — способ вызова: POST /requests, poll .../result.

## Документация (всё по ссылкам, без дублирования)

docs/README.md — индекс. Оттуда: AGENTS.md, SEQUENCE.md, flow-graph-requests.md, LOADING.md, json-in-cmd.md, websitestore-challenges, ADR.

## Твоя задача

1. Создать множество кейсов, при которых срабатывает `graph_incomplete`.
2. Обеспечить, чтобы вопросы попадали в логи графа знаний.
3. Обеспечить, чтобы ответы попадали в логи графа знаний.

(добавь сюда конкретную задачу перед отправкой)
```


проведи испытания , проверь систему 




Created the `process-input` script.

**Script:** `a2a-server/scripts/process-input.ts`

- **Input:** MD file with `context` and `file` blocks (per `a2a-client/docs/requirements.md`)
- **Processing:** Uses core logic (no DB): `processNewTaskToContext`, `recognizeEntitiesBatch`, `buildAndStoreGraph`, `generateQuestionsFromGraph`
- **Output:** MD file with context, outcome, entities, relations, and questions

**Usage:**
```bash
# from repo root
npx tsx a2a-server/scripts/process-input.ts [input.md] [output.md]
# defaults: docs/adr-hacks/archive/raw/etalon-D-request.md → output/etalon-D-result.md
```

**Example run:**
```
Input: docs/adr-hacks/archive/raw/etalon-D-request.md
Output: output/etalon-D-result.md
Outcome: completed
```

**Output format:** `context` block + outcome, message, entities, relations, and questions for analysis.

`output/` is in `.gitignore`. `docs/adr-hacks/README.md` documents the script.