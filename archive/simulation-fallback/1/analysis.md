# Simulation Fallback - Analysis

## Случай: Работа с агентом (auto-ai)

**Запрос:** "исправить импорты в vue компонентах после рефакторинга"

---

## Workflow

```
new_task → Поиск в базе → NOT FOUND
                          ↓
         Выбор: [Создать action] или [Auto-AI]
                          ↓
              Выбрано: Auto-AI
                          ↓
         Выбор варианта auto-ai
                          ↓
         Инициализация сессии с агентом
```

---

## Доступные Auto-AI режимы

| Variant | Title | Workflow Steps |
|---------|-------|----------------|
| 1-context-collection | Сбор контекста | scan → index → search → prompt |
| 2-code-analysis | Анализ кода | detect_stack → graph → patterns → issues → report |
| 4-code-generation | Генерация кода | collect → send_to_ai → receive → apply → test |
| 5-hybrid | Гибридный | quick_scan → generate_plan → approve → generate → verify |

---

## Выбранный режим: 2-code-analysis

### Workflow

1. **Определить технологический стек**
   - Vue 3, Vite, Inertia, Pinia
   - Результат: { "frontend": "vue", "state": "pinia" }

2. **Построить граф зависимостей**
   - Как компоненты связаны
   - Результат: { "nodes": 50, "edges": 120 }

3. **Найти паттерны импортов**
   - Какие пути используются (@/, ~/, ../)
   - Результат: паттерны

4. **Выявить проблемные места**
   - Сломанные, устаревшие импорты
   - Результат: { "broken_import": 5 }

5. **Сформировать отчёт**
   - Рекомендации по исправлению
   - Результат: отчёт с рекомендациями

---

## Session

```json
{
  "id": "session-abc123",
  "agent": "claude",
  "status": "awaiting_selection"
}
```

---

## Response Structure

```json
{
  "outcome": "agent_mode_selected",
  "selected_mode": "auto-ai",
  "variant": "2-code-analysis",
  "workflow": [
    { "step": "Определить стек", "action": "detect_stack" },
    { "step": "Построить граф", "action": "build_graph" }
  ]
}
```
