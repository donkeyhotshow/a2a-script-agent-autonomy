# Simulation True - Analysis

## Случай: Создание нового action с детализацией

**Запрос:** "исправить импорты в vue компонентах после рефакторинга"

---

## Workflow

```
new_task → Поиск в базе → NOT FOUND
                          ↓
         Выбор: [Создать action] или [Auto-AI]
                          ↓
              Выбрано: Создать новый action
                          ↓
         Phase 1: Global Actions → Подтвердить/Редактировать
                          ↓
         Phase 2: Local Steps → Подтвердить/Перегенерировать
                          ↓
         Phase 3: Генерация кода → Добавить требования
                          ↓
         При необходимости: Перегенерировать с новыми требованиями
```

---

## Phase 1: Генерация Global Actions

Ollama (rnj-1) генерирует high-level действия:

```
Action 1: Сканировать файлы проекта
Action 2: Проанализировать импорты
Action 3: Найти сломанные импорты
Action 4: Исправить импорты
Action 5: Верифицировать
```

Каждое действие имеет:
- input (откуда данные)
- output (куда данные)

**Пользователь:** Подтверждает или редактирует

---

## Phase 2: Детализация Local Steps

Для каждого global action генерируются локальные шаги:

```
Action 1: Сканировать файлы
  └─ Step 1.1: find *.vue
  └─ Step 1.2: find *.js с импортами

Action 2: Проанализировать импорты
  └─ Step 2.1: parse_imports.py (input: files_list)

Action 3: Найти сломанные
  └─ Step 3.1: check_paths.py (input: imports_list)

Action 4: Исправить
  └─ Step 4.1: generate_replacements.py
  └─ Step 4.2: apply_replacements.py

Action 5: Верифицировать
  └─ Step 5.1: npm run lint
```

Каждый step:
- command или script
- input_from (откуда данные)
- output (какие данные на выход)

---

## Phase 3: Генерация кода скриптов

Пользователь добавляет требования к каждому скрипту:

```json
{
  "script_name": "parse_imports.py",
  "requirements": "Парсит файлы, извлекает import statements",
  "edge_cases": "Обработать: @, ~, ../, npm"
}
```

Ollama генерирует код с учётом требований.

### Перегенерирование

Если результат не удовлетворяет:
1. Пользователь добавляет новые требования
2. Ollama перегенерирует скрипт
3. Повторяется пока не будет удовлетворять

---

## Response Structure

```json
{
  "outcome": "action_creation",
  "fallbackOptions": [
    { "type": "create_new_action" },
    { "type": "auto_ai" }
  ],
  "selected_option": { "type": "create_new_action" },
  "action_creation_workflow": {
    "phase1": { "global_actions": [...], "status": "awaiting_confirmation" },
    "phase2": { "local_steps": [...], "status": "pending" },
    "phase3": { "scripts_to_generate": [...], "regeneration_round": {...} }
  }
}
```
