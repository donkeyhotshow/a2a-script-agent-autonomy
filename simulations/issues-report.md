# Отчёт по недоработкам симуляций

## Общее описание

Проведён анализ всех симуляций в директории `simulations/`. Найдено значительное количество несоответствий схеме [`SCHEMA.md`](SCHEMA.md), нелогичных переходов и упущенных деталей.

### Критические проблемы:
1. **Несоответствие формату execute** - в некоторых симуляциях используется устаревший flat-формат вместо action-key shape
2. **Неполная история** - в request/response парах history не синхронизируется корректно
3. **Пропущенные шаги** - некоторые LLM-шаги не имеют request.md/response.md файлов
4. **Несоответствие result формату** - не все result используют action-key shape

---

## Детальный разбор по каждой симуляции

### 1. coder/ (AI-Actions тип)

#### Шаг 3: `coder/3/request.json`
**Проблема:** В истории отсутствует `rag-search` результат от предыдущего шага.
- **Ожидалось:** В `history` должен быть результат `rag-search` с `params`
- **Фактически:** Только `assistant` сообщение без `action` и `params` в response, но в history не переносится корректно

#### Шаг 4: `coder/4/request.json`
**Проблема:** Несоответствие формата result.
- **Схема требует:** `result: { "rag-search": { "results": [...], "files": [...] } }` (action-key shape)
- **Фактически:** Формат соответствует, ✅ **OK**

#### Шаг 5: `coder/5/request.json`
**Проблема:** В истории отсутствует `action` и `params` для `rag-search` и `read-file`.
- Согласно `response.md` LLM отправляет `action: "rag-search"` с `params`, но в истории `coder/5/request.json` отсутствуют эти `params`

#### Шаг 5: `coder/5/response.json`
**Проблема:** Неполная история в context.
- **Найдено:** В history добавляется assistant сообщение с `action: "continue"`, но в `execute` отправляется `rag-search`
- **Несоответствие:** между `action: "continue"` в истории и `action: "rag-search"` в execute

#### Шаг 6: `coder/6/response.json`
**Проблема:** Отсутствует индикатор завершения.
- **Схема требует:** Для AI-Actions должен быть `completed: true` или `action: "complete"`
- **Фактически:** Есть `execution.step: "completed"`, но в `execute` нет явного сигнала завершения

#### Шаг 7: `coder/7/response.json`
**Проблема:** `execute.message` находится вне `execute` объекта.
- **Схема требует:** `"execute": { "message": "..." }` или `"execute": { "write-file": {...} }`
- **Фактически:** `"message"` находится на одном уровне с `execute.write-file`, а не внутри `execute`
- **Строка 63:** `"message": "Запишу детальний звіт..."` - должно быть внутри `execute`

#### Шаг 8: `coder/8/response.json`
**Проблема:** Отсутствует поле `execute` с пустым объектом для завершения.
- **Схема рекомендует:** `"execute": {}` для явного сигнала завершения
- **Фактически:** Есть `message` но нет явного завершения

---

### 2. fix-vue-imports/ (Actions тип)

#### Шаг 2: `fix-vue-imports/2/response.json`
**Проблема:** Используется устаревший формат `script`.
- **Схема требует:** Каждый ключ в `execute` - это action type
- **Фактически:** `"execute": { "script": { "input": {...}, "output": "...", "code": "..." } }` - неясен формат

#### Шаг 3: `fix-vue-imports/3/request.json`
**Проблема:** Неправильный формат result.
- **Схема требует:** `result: { "script": { "broken_imports": [...] } }` (action-key shape)
- **Фактически:** `result.script.scan-phpunit` - вложенность не соответствует

#### Шаг 5: `fix-vue-imports/5/response.json`
**Проблема:** Последний шаг не сигнализирует о завершении.
- **Схема рекомендует:** Для Actions конец алгоритма = конец задачи, но можно явно указать `"execute": {}`
- **Фактически:** Отсутствует явный сигнал завершения

---

### 3. fix-vue-imports-batched/ (Actions тип)

#### Шаг 5: `fix-vue-imports-batched/5/response.json`
**Критическая проблема:** Неверная структура JSON.
- **Проблема:** Поле `result` находится ВНУТРИ объекта `execute`, а не на уровне `context`
- **Строка 32-38:** `"result": { "script": {...} }` находится внутри `execute`, что нарушает схему
- **Схема требует:** `context`, `execute` как отдельные поля на верхнем уровне

#### Шаг 5: `fix-vue-imports-batched/5/request.json`
**Проблема:** Неправильный формат result.
- **Фактически:** `result.script.broken_imports_count` и `result.script.files_saved_locally`
- **Схема требует:** Action-key shape, но здесь это скорее статус выполнения скрипта

#### Шаг 5-8: `fix-vue-imports-batched/*`
**Проблема:** Несоответствие между `progress.totalFiles` и обработанными файлами.
- В `progress` указано 50 файлов, но обрабатывается только 3 файла
- После шага 8 сразу `completed`, хотя должно быть 47 шагов ещё

---

### 4. auto-ai/ (AI-Actions тип)

#### Шаг 4: `auto-ai/4/response.json`
**Проблема:** Используется нестандартное действие `list-directory`.
- **Схема:** Не описано действие `list-directory` в таблице execute
- **Допустимые:** `message`, `form`, `read-file`, `write-file`, `rag-search`, `execute-command`, `script`

#### Шаг 6: `auto-ai/6/response.json`
**Проблема:** Та же проблема с `list-directory` - отсутствует в схеме.

#### Шаг 9: `auto-ai/9/response.json`
**Проблема:** Используется `grep-search`, которого нет в схеме.
- **Схема:** Не описано действие `grep-search`
- **Допустимые:** Только стандартные команды

#### Шаг 15: `auto-ai/15/response.json`
**Критическая проблема:** Неверная структура JSON.
- **Проблема:** Поле `execute` находится ВНУТРИ `context`, а не на верхнем уровне
- **Строка 24-37:** `"execute": { "form": {...} }` вложен в `context`
- **Схема требует:** `context` и `execute` как отдельные поля на верхнем уровне

---

### 5. analyze/ (AI-Actions тип)

#### Шаг 6: `analyze/6/request.json`
**Проблема:** Неправильный формат result.
- **Схема требует:** `result: { "rag-search": { "results": [...], "files": [...] } }`
- **Фактически:** Формат соответствует, ✅ **OK**

#### Шаг 7: `analyze/7/response.json`
**Проблема:** Отсутствует `message` внутри `execute`.
- **Схема:** Для отображения на вебе требуется `execute.message`
- **Фактически:** Только `execute.write-file`, сообщение для пользователя не покажется

#### Шаг 8: `analyze/8/response.json`
**Проблема:** `execute` находится на неверном уровне вложенности.
- **Строка 59-89:** `execute` вложен в `context`, а не на верхнем уровне
- **Схема требует:** `execute` на верхнем уровне response

---

### 6. coder-smart/ (Actions тип)

#### Шаг 2: `coder-smart/2/request.json`
**Проблема:** Отсутствует `execution.step` в соответствии с описанием.
- **description.md:** Шаги: user-request → rag-clarify → rag-research-plan → checklist → write-doc → execute-item
- **Фактически:** Шаг называется `user-request`, но в response.json указан `step: "coder-smart"`

#### Шаг 3: `coder-smart/3/request.json`
**Проблема:** `execution.step: "coder-smart"` не соответствует документации.
- **Ожидалось:** `step: "user-request"`
- **Фактически:** `step: "coder-smart"`

#### Шаг 5: `coder-smart/5/response.json`
**Проблема:** Отсутствует `message` для веба.
- **Схема:** Для отображения на вебе нужен `execute.message`
- **Фактически:** Только `execute.form`, без сообщения для пользователя

#### Шаг 6: `coder-smart/6/response.json`
**Проблема:** `history` пустой, хотя должна содержать предыдущие шаги.
- Должна быть история с `user-request` и `rag-clarify`

#### Шаг 7: `coder-smart/7/request.json`
**Проблема:** Неправильный формат result.
- **Схема требует:** `result: { "write-file": { "path": "...", "success": true } }`
- **Фактически:** `result: { "write-file": { "path": "...", "success": true } }` - ✅ **OK**

#### Шаг 8: `coder-smart/8/request.json`
**Проблема:** `history` пустой, должна содержать все предыдущие шаги.

#### Шаг 9: `coder-smart/9/request.json`
**Проблема:** Неправильный формат result.
- **Схема требует:** `result: { "write-file": { "path": "...", "success": true } }`
- **Фактически:** `result: { "write-file": { "path": "...", "success": true } }` - ✅ **OK**

---

### 7. task-decomposition/ (Actions тип)

#### Шаг 3: `task-decomposition/3/request.json`
**Проблема:** `execution.step: "task-decomposition"` вместо ожидаемого `capture-task`.
- **Фактически:** Шаг из шага 2 `capture-task` перешёл в `task-decomposition`

#### Шаг 4: `task-decomposition/4/`
**Проблема:** Отсутствуют файлы `request.json` и `response.json`?
- **Фактически:** Есть только `request.md` и `response.md` - это шаг с LLM

#### Шаг 7: `task-decomposition/7/request.json`
**Проблема:** Неправильный формат result.
- **Схема требует:** `result: { "write-file": { "path": "..." } }` или `result: { "script": "..." }`
- **Фактически:** `result: { "script": ".carrier/tasks/task-1.md" }` - неясно, что это значит

#### Шаг 8: `task-decomposition/8/request.json`
**Проблема:** Неправильный формат result.
- **Схема требует:** Форму с `choice` или `message`
- **Фактически:** Длинный текст в `result.message` без структуры

---

### 8. phpunit-deprecations/ (Actions тип)

#### Шаг 3: `phpunit-deprecations/3/request.json`
**Проблема:** Неправильный формат result.
- **Схема требует:** `result: { "script": { "files": [...] } }` или action-key shape
- **Фактически:** `result.script.scan-phpunit.files` - вложенность не соответствует

#### Шаг 4: `phpunit-deprecations/4/response.json`
**Проблема:** `result` находится внутри `execute` (см. строку 45-46).
- В `request.json` result правильно структурирован, но в `response.json` нет поля `result`

#### Шаг 5: `phpunit-deprecations/5/request.json`
**Проблема:** Неправильный формат result.
- **Фактически:** `result.script.report` - текст отчёта внутри script

#### Шаг 5: `phpunit-deprecations/5/response.json`
**Проблема:** Отсутствует явный сигнал завершения.
- **Схема рекомендует:** `"execute": {}` для завершения Actions
- **Фактически:** Пустой объект без `execute`

---

## Сводная таблица всех недоработок

| Симуляция | Шаг | Тип проблемы | Описание | Критичность |
|-----------|-----|--------------|----------|-------------|
| coder | 3 | Неполная история | Отсутствуют params в history | Средняя |
| coder | 5 | Несоответствие | Различие action в history и execute | Высокая |
| coder | 6 | Отсутствие сигнала | Нет явного completed в execute | Средняя |
| coder | 7 | Неверная структура | message вне execute | Высокая |
| fix-vue-imports | 2 | Устаревший формат | script без action-key shape | Средняя |
| fix-vue-imports | 3 | Неверный формат | result.script.scan-phpunit | Средняя |
| fix-vue-imports | 5 | Отсутствие сигнала | Нет явного завершения | Низкая |
| fix-vue-imports-batched | 5 | Критическая ошибка | result внутри execute | Критическая |
| fix-vue-imports-batched | 5-8 | Нелогичность | 50 файлов, обработано 3 | Высокая |
| auto-ai | 4,6 | Нестандартное действие | list-directory не в схеме | Средняя |
| auto-ai | 9 | Нестандартное действие | grep-search не в схеме | Средняя |
| auto-ai | 15 | Критическая ошибка | execute внутри context | Критическая |
| analyze | 7 | Отсутствие message | Нет execute.message | Низкая |
| analyze | 8 | Критическая ошибка | execute внутри context | Критическая |
| coder-smart | 2,3 | Несоответствие | Неверные названия шагов | Средняя |
| coder-smart | 5 | Отсутствие message | Нет execute.message | Низкая |
| coder-smart | 6,8 | Пустая история | history: [] вместо накопленной | Средняя |
| task-decomposition | 3 | Несоответствие | Неверный step name | Низкая |
| task-decomposition | 7 | Неверный формат | result.script как путь | Средняя |
| task-decomposition | 8 | Неверный формат | Длинный текст в message | Низкая |
| phpunit-deprecations | 3 | Неверный формат | result.script.scan-phpunit | Средняя |
| phpunit-deprecations | 5 | Отсутствие сигнала | Нет execute для завершения | Низкая |

---

## Рекомендации по исправлению

### 1. Критические ошибки (немедленное исправление)

#### Исправить вложенность JSON:
- `fix-vue-imports-batched/5/response.json` - вынести `result` на верхний уровень
- `auto-ai/15/response.json` - вынести `execute` из `context` на верхний уровень
- `analyze/8/response.json` - вынести `execute` из `context` на верхний уровень

#### Исправить формат execute:
- `coder/7/response.json` - перенести `message` внутрь `execute`
- `coder/8/response.json` - добавить `"execute": {}` для завершения

### 2. Исправление форматов result

Привести все `result` к action-key shape:
```json
// Правильно:
{ "result": { "read-file": { "path": "...", "content": "..." } } }
{ "result": { "rag-search": { "results": [...], "files": [...] } } }

// Неправильно:
{ "result": { "script": { "scan-phpunit": { "files": [...] } } } }
```

### 3. Исправление history

Обеспечить синхронизацию history между request/response:
- Каждый assistant/system шаг должен добавляться в history
- `action` и `params` должны сохраняться в history для отслеживания

### 4. Добавление сообщений для веба

Всем ответам, которые должны показываться на вебе, добавить:
```json
{
  "execute": {
    "message": "Текст для отображения в диалоге",
    "form": { ... }
  }
}
```

### 5. Стандартизация действий

Либо добавить в схему недостающие действия:
- `list-directory`
- `grep-search`

Либо заменить их на существующие:
- `list-directory` → `script` с соответствующим кодом
- `grep-search` → `rag-search` или `script`

### 6. Логика завершения

Для AI-Actions явно указывать завершение:
```json
{
  "execute": {
    "message": "Задача завершена",
    "form": { ... }
  },
  "context": {
    "execution": { "step": "completed" }
  }
}
```

Для Actions добавлять пустой execute:
```json
{ "execute": {} }
```

### 7. Консистентность шагов

Привести названия шагов в соответствие с `description.md`:
- `coder-smart/2/`: `coder-smart` → `user-request`
- `coder-smart/3/`: `coder-smart` → `rag-clarify`
- `task-decomposition/3/`: `task-decomposition` → `capture-task`

### 8. Исправление нелогичных переходов

В `fix-vue-imports-batched`:
- Либо изменить `progress.totalFiles` с 50 на 3
- Либо добавить недостающие 47 шагов
- Либо сделать step-loop для обработки всех файлов

---

## Заключение

Всего найдено **22 проблемы** различной степени критичности:
- **3 критические** - нарушение структуры JSON, требуют немедленного исправления
- **7 высокой** - несоответствие схеме, влияют на работу системы
- **9 средней** - форматные проблемы, частичная работоспособность
- **3 низкой** - косметические проблемы, не влияют на работу

Приоритет исправления: критические → высокие → средние → низкие.
