# Simulation Action - Analysis

## Случай: Action найден в базе

**Запрос:** "исправить импорты в vue компонентах после рефакторинга"

---

## Workflow

```
new_task → Семантический поиск в базе → ACTION FOUND
                                           ↓
                               Предложить action со steps
                                           ↓
                               Пользователь подтверждает
                                           ↓
                               Выполнение шагов (1→2→3→4→5→6)
```

---

## Action: fix-vue-imports

Найден в базе: `a2a-server/src/acions/vue/fix-vue-imports.md`

### Шаги с передачей данных

| Step | Name | Command/Script | Output | Transfers to |
|------|------|----------------|--------|--------------|
| 1 | Сканирование файлов | `find ...` | file_list | → 2 |
| 2 | Парсинг импортов | parse_imports.py | imports_list | → 3 |
| 3 | Верификация путей | verify_paths.py | verified_imports | → 4 |
| 4 | Генерация исправлений | generate_fixes.py | replacement_script | → 5 |
| 5 | Применение исправлений | apply_replacements.py | applied_fixes | → 6 |
| 6 | Верификация | npm run lint | verification_result | - |

---

## Детализация

### Step 1: Сканирование файлов
```bash
find resources/js -type f \( -name "*.vue" -o -name "*.js" \) | xargs grep -l "from"
```

### Step 2: Парсинг импортов
- Извлекает import statements
- Определяет тип пути: alias (@/, ~/), relative (../), npm

### Step 3: Верификация путей
- Контекст: aliases { "@": "resources/js", "~": "resources" }
- Проверяет существование файлов
- Предлагает исправления

### Step 4-5: Исправление
- Генерирует замены
- Применяет к файлам

### Step 6: Верификация
```bash
npm run lint -- --fix
```

---

## Response Structure

```json
{
  "outcome": "actions_proposed",
  "message": "Найден action",
  "proposedActions": [{
    "actionId": "fix-vue-imports",
    "subActions": [
      "vue-import-detect",
      "vue-import-resolve",
      "vue-import-apply",
      "vue-import-cleanup"
    ]
  }],
  "context": {
    "task": "исправить импорты в vue компонентах",
    "framework": "vue",
    "found": true
  }
}
```

---

## New Format (Action-Based)

Вместо steps теперь используются subActions - это ссылки на другие action IDs, которые выполняются последовательно. Детали каждого subAction загружаются с сервера по API.
