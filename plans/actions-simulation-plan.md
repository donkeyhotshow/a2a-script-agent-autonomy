# План: Симуляції для кожного Non-Placeholder Екшена

## Ціль

Створити симуляції для кожного робочого екшена (не пустишки), щоб можна було:
1. Брати `request.json` з папки симуляції
2. Відправляти на сервер
3. Зберігати відповідь у `server-response.json` 
4. Порівнювати з `response.json` (еталон)

## Референс: simulations/pilot

Приклад: [`simulations/pilot/1/request.json`](simulations/pilot/1/request.json)

```
simulations/pilot/1/request.json  →  Сервер  →  simulations/pilot/1/server-response.json
                                        ↓
                               Порівнюємо з response.json
```

---

## Список Non-Placeholder Екшенів

### 🔴 Високий пріоритет (Базова функціональність)

| # | Екшен | Файл визначення | Sub-actions | Симуляція |
|---|-------|-----------------|-------------|-----------|
| 1 | fix-vue-imports | [`a2a-server/src/actions/definitions/fix-vue-imports.md`](a2a-server/src/actions/definitions/fix-vue-imports.md) | 4 (detect→resolve→apply→cleanup) | `simulations/fix-vue-imports/` |
| 2 | analyze-full | [`definitions/analysis/analyze-full.md`](a2a-server/src/actions/definitions/analysis/analyze-full.md) | TBD | `simulations/analyze-full/` |
| 3 | hybrid-fix | [`definitions/hybrid/hybrid-fix.md`](a2a-server/src/actions/definitions/hybrid/hybrid-fix.md) | TBD | `simulations/hybrid-fix/` |
| 4 | dialog | [`definitions/dialog.md`](a2a-server/src/actions/definitions/dialog.md) | TBD | `simulations/dialog/` |

### 🟡 Середній пріоритет (Аналіз)

| # | Екшен | Файл визначення | Симуляція |
|---|-------|-----------------|-----------|
| 5 | analyze-architecture | [`definitions/analysis/analyze-architecture.md`](a2a-server/src/actions/definitions/analysis/analyze-architecture.md) | `simulations/analyze-architecture/` |
| 6 | analyze-laravel | [`definitions/analysis/analyze-laravel.md`](a2a-server/src/actions/definitions/analysis/analyze-laravel.md) | `simulations/analyze-laravel/` |
| 7 | analyze-performance | [`definitions/analysis/analyze-performance.md`](a2a-server/src/actions/definitions/analysis/analyze-performance.md) | `simulations/analyze-performance/` |
| 8 | analyze-security | [`definitions/analysis/analyze-security.md`](a2a-server/src/actions/definitions/analysis/analyze-security.md) | `simulations/analyze-security/` |
| 9 | analyze-typescript | [`definitions/analysis/analyze-typescript.md`](a2a-server/src/actions/definitions/analysis/analyze-typescript.md) | `simulations/analyze-typescript/` |
| 10 | analyze-vue | [`definitions/analysis/analyze-vue.md`](a2a-server/src/actions/definitions/analysis/analyze-vue.md) | `simulations/analyze-vue/` |
| 11 | phpunit-deprecations | [`definitions/analysis/phpunit-deprecations.md`](a2a-server/src/actions/definitions/analysis/phpunit-deprecations.md) | `simulations/phpunit-deprecations/` |

### 🟢 Генерація

| # | Екшен | Файл визначення | Симуляція |
|---|-------|-----------------|-----------|
| 12 | generate-crud | [`definitions/generation/generate-crud.md`](a2a-server/src/actions/definitions/generation/generate-crud.md) | `simulations/generate-crud/` |
| 13 | generate-controller | [`definitions/generation/generate-controller.md`](a2a-server/src/actions/definitions/generation) | `sim/generate-controller.mdulations/generate-controller/` |
| 14 | generate-model | [`definitions/generation/generate-model.md`](a2a-server/src/actions/definitions/generation/generate-model.md) | `simulations/generate-model/` |
| 15 | generate-migration | [`definitions/generation/generate-migration.md`](a2a-server/src/actions/definitions/generation/generate-migration.md) | `simulations/generate-migration/` |
| 16 | generate-method | [`definitions/generation/generate-method.md`](a2a-server/src/actions/definitions/generation/generate-method.md) | `simulations/generate-method/` |
| 17 | generate-test | [`definitions/generation/generate-test.md`](a2a-server/src/actions/definitions/generation/generate-test.md) | `simulations/generate-test/` |
| 18 | generate-view | [`definitions/generation/generate-view.md`](a2a-server/src/actions/definitions/generation/generate-view.md) | `simulations/generate-view/` |

### 🔵 Графові

| # | Екшен | Файл визначення | Симуляція |
|---|-------|-----------------|-----------|
| 19 | graph-build | [`definitions/graph/graph-build.md`](a2a-server/src/actions/definitions/graph/graph-build.md) | `simulations/graph-build/` |
| 20 | graph-extract-entities | [`definitions/graph/graph-extract-entities.md`](a2a-server/src/actions/definitions/graph/graph-extract-entities.md) | `simulations/graph-extract-entities/` |
| 21 | graph-extract-relations | [`definitions/graph/graph-extract-relations.md`](a2a-server/src/actions/definitions/graph/graph-extract-relations.md) | `simulations/graph-extract-relations/` |
| 22 | graph-impact | [`definitions/graph/graph-impact.md`](a2a-server/src/actions/definitions/graph/graph-impact.md) | `simulations/graph-impact/` |
| 23 | graph-query | [`definitions/graph/graph-query.md`](a2a-server/src/actions/definitions/graph/graph-query.md) | `simulations/graph-query/` |
| 24 | graph-visualize | [`definitions/graph/graph-visualize.md`](a2a-server/src/actions/definitions/graph/graph-visualize.md) | `simulations/graph-visualize/` |

### 🟣 Контекст

| # | Екшен | Файл визначення | Симуляція |
|---|-------|-----------------|-----------|
| 25 | context-scan | [`definitions/context/context-scan.md`](a2a-server/src/actions/definitions/context/context-scan.md) | `simulations/context-scan/` |
| 26 | context-query | [`definitions/context/context-query.md`](a2a-server/src/actions/definitions/context/context-query.md) | `simulations/context-query/` |
| 27 | context-rank | [`definitions/context/context-rank.md`](a2a-server/src/actions/definitions/context/context-rank.md) | `simulations/context-rank/` |
| 28 | context-index | [`definitions/context/context-index.md`](a2a-server/src/actions/definitions/context/context-index.md) | `simulations/context-index/` |
| 29 | context-format | [`definitions/context/context-format.md`](a2a-server/src/actions/definitions/context/context-format.md) | `simulations/context-format/` |

### 🟠 Гібридні

| # | Екшен | Файл визначення | Симуляція |
|---|-------|-----------------|-----------|
| 30 | hybrid-explain | [`definitions/hybrid/hybrid-explain.md`](a2a-server/src/actions/definitions/hybrid/hybrid-explain.md) | `simulations/hybrid-explain/` |
| 31 | hybrid-improve | [`definitions/hybrid/hybrid-improve.md`](a2a-server/src/actions/definitions/hybrid/hybrid-improve.md) | `simulations/hybrid-improve/` |
| 32 | hybrid-refactor | [`definitions/hybrid/hybrid-refactor.md`](a2a-server/src/actions/definitions/hybrid/hybrid-refactor.md) | `simulations/hybrid-refactor/` |

---

## Структура кожної симуляції

### Папка: `simulations/<action-id>/`

```
simulations/fix-vue-imports/
├── analysis.md              # Опис що тестуємо, очікувані результати
├── 1/
│   ├── request.json         # task_request
│   ├── response.json        # ОЧІКУВАНА відповідь сервера (еталон)
│   └── server-response.json # РЕАЛЬНА відповідь сервера (буде оновлюватись)
├── 2/
│   ├── request.json         # approve_action
│   ├── response.json
│   └── server-response.json
├── 3/
│   ├── request.json         # step_result (перший sub-action)
│   ├── response.json
│   └── server-response.json
├── 4/
│   ├── request.json         # step_result (другий sub-action)
│   ├── response.json
│   └── server-response.json
└── 5/
    ├── request.json         # action_complete
    ├── response.json
    └── server-response.json
```

### Приклад: request.json (крок 1)

```json
{
  "action": "task_request",
  "task": "исправить импорты в vue компонентах",
  "context": {
    "version": "1.0",
    "session_id": "test-session-fix-vue"
  }
}
```

### Приклад: response.json (крок 1)

```json
{
  "outcome": "action_proposal",
  "message": "Найден подходящий экшен в базе",
  "context": {
    "version": "1.0",
    "session_id": "test-session-fix-vue",
    "task": "исправить импорты в vue компонентах"
  },
  "proposedActions": [
    {
      "actionId": "fix-vue-imports",
      "title": "Исправить сломанные импорты в Vue файлах",
      "description": "Автоматически определить и исправить проблемы с импортами",
      "priority": 10,
      "matchScore": 0.95,
      "subActions": [
        {
          "actionId": "vue-import-detect",
          "title": "Определить сломанные импорты",
          "input": "none",
          "output": "broken_imports[]"
        },
        {
          "actionId": "vue-import-resolve",
          "title": "Разрешить правильные пути",
          "input": "broken_imports[]",
          "output": "patches[]"
        },
        {
          "actionId": "vue-import-apply",
          "title": "Применить исправления",
          "input": "patches[]",
          "output": "fixed_files[]"
        },
        {
          "actionId": "vue-import-cleanup",
          "title": "Очистить временные файлы",
          "input": "none",
          "output": "cleanup_count"
        }
      ]
    }
  ]
}
```

---

## Як запускати симуляції

### Варіант 1: Вручну

```bash
# 1. Запустити сервер
cd a2a-server && npm run dev

# 2. Відправити request.json на сервер
curl -X POST http://localhost:3000/api/v1/task \
  -H "Content-Type: application/json" \
  -d @simulations/fix-vue-imports/1/request.json

# 3. Зберегти відповідь у server-response.json
# 4. Порівняти: diff response.json server-response.json
```

### Варіант 2: Автоматизований скрипт

Створити `scripts/simulate.js`:

```javascript
// Псевдокод
const actions = [
  'fix-vue-imports',
  'analyze-full',
  'hybrid-fix',
  // ... всі 32 екшени
];

for (const action of actions) {
  // Запустити кожен крок симуляції
  // Зберегти server-response.json
  // Порівняти з response.json
}
```

---

## TODO List для симуляцій

### Фаза 1: Базова функціональність (4 екшени)

- [ ] 1. fix-vue-imports
- [ ] 2. analyze-full  
- [ ] 3. hybrid-fix
- [ ] 4. dialog

### Фаза 2: Аналіз (7 екшенів)

- [ ] 5. analyze-architecture
- [ ] 6. analyze-laravel
- [ ] 7. analyze-performance
- [ ] 8. analyze-security
- [ ] 9. analyze-typescript
- [ ] 10. analyze-vue
- [ ] 11. phpunit-deprecations

### Фаза 3: Генерація (7 екшенів)

- [ ] 12. generate-crud
- [ ] 13. generate-controller
- [ ] 14. generate-model
- [ ] 15. generate-migration
- [ ] 16. generate-method
- [ ] 17. generate-test
- [ ] 18. generate-view

### Фаза 4: Графи (6 екшенів)

- [ ] 19. graph-build
- [ ] 20. graph-extract-entities
- [ ] 21. graph-extract-relations
- [ ] 22. graph-impact
- [ ] 23. graph-query
- [ ] 24. graph-visualize

### Фаза 5: Контекст (5 екшенів)

- [ ] 25. context-scan
- [ ] 26. context-query
- [ ] 27. context-rank
- [ ] 28. context-index
- [ ] 29. context-format

### Фаза 6: Гібридні (3 екшени)

- [ ] 30. hybrid-explain
- [ ] 31. hybrid-improve
- [ ] 32. hybrid-refactor

---

## Критерії завершення

Для кожного екшена потрібно:
1. Створити папку `simulations/<action-id>/`
2. Написати `analysis.md` - що тестуємо
3. Створити кроки 1-N з request.json та response.json
4. Запустити симуляцію та зберегти server-response.json
5. Перевірити що diff показує очікувані відмінності

---

**Всього екшенів для симуляції:** 32  
**Пріорітет:** Високий - спочатку 1-4, потім решта

**Дата:** 2026-02-25
