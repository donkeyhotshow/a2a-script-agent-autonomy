# План исправления Simulation 1: fix-vue-imports

## Сравнение: Gold Standard vs Server Response

### Gold Standard ([`response.json`](simulations/pilot/1/response.json))
```json
{
  "outcome": "action_proposal",
  "message": "Найден подходящий экшен в базе",
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "title": "Исправить сломанные импорты в Vue файлах",
      "subActions": [ ...4 sub-actions... ]
    }
  ],
  "fallbackActions": [ ...2 fallback options... ]
}
```

### Server Response ([`server-response.json`](simulations/pilot/1/server-response.json))
```json
{
  "outcome": "graph_incomplete",
  "message": "Graph incomplete, need more context",
  "questions": ["Please provide the relevant code files..."],
  "missing": ["No entities recognized"]
}
```

---

## Ключевые различия

| Параметр | Gold Standard | Server |
|----------|---------------|--------|
| `outcome` | `action_proposal` | `graph_incomplete` |
| `message` | "Найден подходящий экшен в базе" | "Graph incomplete, need more context" |
| `proposedActions` | ✅ Есть (fix-vue-imports) | ❌ Нет |
| `subActions` | ✅ 4 sub-actions | ❌ Нет |
| `fallbackActions` | ✅ Есть | ❌ Нет |
| `questions` | ❌ Нет | ✅ Есть |
| `missing` | ❌ Нет | ✅ Есть |

---

## Корневая причина

**Сервер не распознаёт задачу и не находит экшен в базе.**

Сервер переходит в фазу `discovery → recognition → analysis → discovery` и застревает в цикле, потому что:
1. Не находит сущности в контексте (нет файлов)
2. Не доходит до логики matching экшенов
3. Просит файлы вместо поиска экшена

---

## Найденные экшены в коде

В [`a2a-server/src/actions/definitions/`](a2a-server/src/actions/definitions/) есть:
- `fix-vue-imports.md` - основной экшен
- `fix-vue-imports.yaml` - YAML версия
- `fix-vue-imports-batch.md`
- `fix-vue-imports-alternatives.md`

Экшены существуют, но **request processor не доходит до них**.

---

## Анализ лога сервера

```
[PhaseMachine] Transition: idle → discovery
[PhaseMachine] Transition: discovery → recognition
[PhaseMachine] Transition: recognition → analysis
[PhaseMachine] Transition: analysis → discovery (need more files)

Invalid transition: discovery → validation
```

**Проблема**: Сервер застревает в цикле `discovery ↔ analysis` потому что нет файлов.

---

## План задач

### Задача 1: Проверить, доходит ли запрос до action matching
- [ ] Добавить логирование в `ActionMatcher` или аналог
- [ ] Проверить, есть ли экшены в базе данных
- [ ] Проверить, вызывается ли action matching логика

### Задача 2: Проверить фазу recognition
- [ ] Почему не распознаются сущности?
- [ ] Добавить детальное логирование в `RecognitionPhase`

### Задача 3: Добавить "задача без файлов" сценарий
- [ ] Если задача текстовая и нет файлов - искать экшен сразу
- [ ] Не переходить в discovery для текстовых задач

### Задача 4: Исправить flow для task_request
- [ ] Проверить flow: `idle → discovery → ??? → action_proposal`
- [ ] Добавить переход в `action` фазу после recognition
- [ ] Реализовать action_proposal outcome

### Задача 5: Интегрировать с Action Database
- [ ] Проверить подключение к БД экшенов
- [ ] Реализовать поиск экшенов по task
- [ ] Добавить subActions в ответ

---

## Следующий шаг

Начать с **Задачи 1**: проверить, есть ли экшены в БД и доходит ли запрос до matching логики.

```bash
# Проверить экшены в БД
cd a2a-server && npx prisma studio
# Искать таблицу Action или similar
```

Или добавить временное логирование в код сервера.
