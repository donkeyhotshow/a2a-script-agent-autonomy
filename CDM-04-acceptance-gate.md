# CDM-04: Acceptance Gate Критерии

## Обзор

 Acceptance Gate — это чеклист обязательных проверок перед удалением любого артефакта из репозитория. Gate применяется после того, как артефакт идентифицирован как кандидат на удаление (через CDM-02 сигналы и CDM-03 формат evidence).

---

## 1. Тесты (Test Gate)

### 1.1 Unit Tests — TypeScript/Node.js (a2a-server, a2a-client)

| Критерий | Команда | Ожидаемый результат |
|----------|---------|---------------------|
| [ ] Все unit тесты проходят | `cd a2a-server && npm run test` | 0 failed |
| [ ] Покрытие не снизилось | `cd a2a-server && npm run test:coverage` | Coverage ≥ текущего уровня |
| [ ] a2a-client тесты проходят | `cd a2a-client && npm test` | 0 failed |

### 1.2 Python Tests (ai-integration)

| Критерий | Команда | Ожидаемый результат |
|----------|---------|---------------------|
| [ ] pytest проходят | `cd ai-integration && python -m pytest` | 0 failed |
| [ ] Типы проверяются (mypy) | `cd ai-integration && python -m mypy` | 0 errors |

### 1.3 Специфичные проверки для удаляемого артефакта

| Критерий | Описание |
|----------|-----------|
| [ ] Нет импортов удаляемого кода в других модулях | Проверить через `grep -r "import.*имя_файла" --include="*.ts"` |
| [ ] Нет ссылок в конфигурации | Проверить imports, exports в package.json |
| [ ] Нет dynamic imports удаляемого кода | `grep -r "require\|import()" --include="*.ts"` |

---

## 2. Симуляции (Simulation Gate)

### 2.1 Линтинг симуляций

| Критерий | Команда | Ожидаемый результат |
|----------|---------|---------------------|
| [ ] Все симуляции проходят lint | `cd a2a-server && npm run sim:lint -- --all --json` | 0 errors |
| [ ] JSON валидация | `cd a2a-server && npm run sim:validate -- --all --json` | 0 errors |

### 2.2 Проверка зависимостей удаляемого кода в симуляциях

| Критерий | Описание |
|----------|-----------|
| [ ] Удаляемый код не используется в request.json | Проверить все симуляции в `simulations/` и `a2a-server/simulations/` |
| [ ] Удаляемый код не используется в response.json | Проверить что execute/result не содержат ссылок |
| [ ] Workbench sections не зависят от удаляемого | Проверить `context.workbench.sections` в симуляциях |

### 2.3 Golden Simulation Проверки

Перед удалением убедиться что:

| Критерий | Описание |
|----------|-----------|
| [ ] Action-Key Shape соблюдается | `{ "execute": { "script": {...} } }` — один action type |
| [ ] Нет deprecated execute types | Нет `execute.error-recovery` |
| [ ] Router choices имеют description + id | Проверить `description.md` и `response.json` |
| [ ] Form metadata: title/description (не input array) | Проверить формы |

---

## 3. Ревью (Review Gate)

### 3.1 Техническое Ревью

| Критерий | Ответственный | Метод |
|----------|---------------|-------|
| [ ] Код ревью изменений | Developer | PR/MR review |
| [ ] Нет breaking changes для клиентов | Tech Lead | Анализ API contracts |
| [ ] Документация обновлена | Developer | Проверить docs/ |
| [ ] Логи удалены из кода | Developer | grep console.* |

### 3.2 DEV_STATE Обновление (Обязательно!)

| Критерий | Описание |
|----------|-----------|
| [ ] DEV_STATE.md обновлён (корневой) | Удаление зафиксировано в cross-module facts |
| [ ] DEV_STATE модуля обновлён | a2a-client/DEV_STATE.md, a2a-server/DEV_STATE.md, ai-integration/DEV_STATE.md |
| [ ] Удалённый артефакт помечен как removed | В секции "Technical Debt" или "Completed" |

**Правила DEV_STATE:**
- Root: только cross-module facts
- Each module: own implementation details
- No abstract statements — все tasks testable
- Remove completed — нет dead roadmap items
- Tasks >14 days old → backlog с blocker reason

### 3.3 Legacy/Deprecation Проверки

| Критерий | Описание |
|----------|-----------|
| [ ] Нет @deprecated маркеров на удаляемом коде | Проверить JSDoc |
| [ ] Нет legacy comments | Проверить `// legacy`, `// old`, `// v1` |
| [ ] Bridges удалены корректно | Проверить convertLegacyToNew функции |

---

## 4. Версионирование (Versioning)

### 4.1 Git Фиксация

| Критерий | Описание |
|----------|-----------|
| [ ] Коммит с описанием удаления | Формат: `chore(cleanup): remove {artifact-name} - CDM-04` |
| [ ] Ссылка на evidence в коммите | CDM-03 ID или описание |
| [ ] Ветка актуальна | Нет незакоммиченных изменений |

### 4.2 Ветвление (если требуется)

| Критерий | Описание |
|----------|-----------|
| [ ] Feature branch создан (если много изменений) | `feature/code-cleanup-{artifact}` |
| [ ] PR/MR открыт | Содержит полный чеклист gates |

### 4.3 Чangelog / Release Notes

| Критерий | Описание |
|----------|-----------|
| [ ] Удаление задокументировано | Если release notes ведутся |
| [ ] Breaking changes отмечены | Если применимо |

---

## 5. Дополнительные Проверки по Типу Артефакта

### 5.1 HTTP Client (node-fetch, axios, http.request)

| Проверка | Действие |
|----------|----------|
| [ ] Все файлы переведены на нативный fetch | Переключить импорты |
| [ ] Тесты HTTP мока проходят | `npm run test:mocks` |
| [ ] Integration тесты работают | `npm run test:e2e` |

### 5.2 Логгер (console.* → Winston)

| Проверка | Действие |
|----------|----------|
| [ ] console.log/error/warn удалены | grep и удалить |
| [ ] Winston импортируется | Использовать centralized logger |
| [ ] Тесты логирования работают | Проверить log output |

### 5.3 Legacy Bridges

| Проверка | Действие |
|----------|----------|
| [ ] convertLegacyToNew удалён | Проверить все usages |
| [ ] Fallback paths удалены | Проверить old path handling |
| [ ] Version checks удалены | Проверить format checks |

### 5.4 Dead Exports / Scripts

| Проверка | Действие |
|----------|----------|
| [ ] Не используется в package.json scripts | Проверить все scripts |
| [ ] Не импортируется другими модулями | grep импорты |
| [ ] Тесты удалены | Удалить связанные test файлы |

---

## 6. Acceptance Gate Checklist Template

```
## Gate: {artifact-name}
Date: {YYYY-MM-DD}
Approved by: {reviewer}

### Test Gate
- [ ] Unit tests pass (a2a-server)
- [ ] Unit tests pass (a2a-client)
- [ ] Coverage maintained
- [ ] No imports found in other modules

### Simulation Gate
- [ ] sim:lint passes
- [ ] sim:validate passes
- [ ] No references in simulations

### Review Gate
- [ ] Code review done
- [ ] DEV_STATE updated (root + module)
- [ ] No breaking changes
- [ ] Documentation updated

### Versioning
- [ ] Commit with proper message
- [ ] PR/MR created if needed
- [ ] Release notes updated (if applicable)

Decision: [APPROVED / REJECTED]
Notes: {optional}
```

---

## 7. Примеры Применения

### Пример 1: Удаление node-fetch из tester/

1. **Test Gate**: Перевести все файлы tester/ на нативный fetch → npm test проходят
2. **Simulation Gate**: Проверить что симуляции не используют node-fetch в execute
3. **Review Gate**: DEV_STATE → Technical Debt → remove node-fetch from tester
4. **Versioning**: `chore(cleanup): remove node-fetch from tester - CDM-04`

### Пример 2: Удаление legacy bridge в newSessions.js

1. **Test Gate**: Убедиться что все fallback paths протестированы
2. **Simulation Gate**: Проверить что симуляции не содержат legacy format
3. **Review Gate**: Проверить convertLegacyToNew не вызывается
4. **Versioning**: Зафиксировать удаление bridge

---

## Следующие шаги (CDM-05)

1. **Автоматизировать gate проверки** — создать скрипт `validate-cleanup-gate.ts`
2. **Интегрировать в CI/CD** — добавить gate в pipeline
3. **Создать dashboard** — визуализация pending cleanups