# Quick Start - Как допросить Cursor

## Шаг 1: Выбери вопрос

Вопросы находятся в `.amazonq/questions-to-cursor/`:

**Приоритет 1 (начни с этих):**
- `WORKFLOW-PHASES.md` → `documentaion/cursor-answers/workflow/workflow-phases.md`
- `CONTEXT-MANAGEMENT.md` → `documentaion/cursor-answers/workflow/context-management.md`
- `actions/FRONTEND-WORKFLOW.md` → `documentaion/cursor-answers/actions/frontend-workflow.md`

**Приоритет 2:**
- `CODE-TRANSFORMATION.md` → `documentaion/cursor-answers/transformation/code-transformation.md`
- `ERROR-RECOVERY.md` → `documentaion/cursor-answers/transformation/error-recovery.md`
- `actions/BACKEND-WORKFLOW.md` → `documentaion/cursor-answers/actions/backend-workflow.md`

**Приоритет 3:**
- `TESTING-VERIFICATION.md` → `documentaion/cursor-answers/transformation/testing-verification.md`
- `SEMANTIC-UNDERSTANDING.md` → `documentaion/cursor-answers/architecture/semantic-understanding.md`
- `actions/QUALITY-TESTING-WORKFLOW.md` → `documentaion/cursor-answers/actions/quality-testing.md`
- `actions/LARAVEL-LINTER-RULES.md` → `documentaion/cursor-answers/actions/laravel-stack.md`

## Шаг 2: Скопируй вопрос в Cursor

1. Открой файл с вопросом (например, `WORKFLOW-PHASES.md`)
2. Скопируй весь текст (Ctrl+A, Ctrl+C)
3. Вставь в Cursor chat
4. Отправь

## Шаг 3: Сохрани ответ

1. Cursor даст ответ (может быть длинным)
2. Скопируй весь ответ
3. Открой соответствующий файл в `documentaion/cursor-answers/`
4. Вставь ответ в секцию "## Ответ"
5. Заполни дату
6. Измени статус на ✅

## Шаг 4: Анализируй

После получения ответа:
1. Прочитай внимательно
2. Выдели ключевые моменты в секции "Ключевые выводы"
3. Подумай как применить в секции "Применение в A2A"
4. Запиши вопросы для уточнения (если есть)

## Шаг 5: Следующий вопрос

Повтори для следующего вопроса из списка приоритетов.

## Советы

- **Не спеши**: Cursor может давать длинные ответы, дай ему время
- **Уточняй**: Если что-то непонятно, задай follow-up вопрос
- **Сохраняй все**: Даже если ответ кажется неполным, сохрани его
- **Комбинируй**: Используй ответы из разных вопросов вместе
- **Экспериментируй**: Попробуй применить на практике

## Пример диалога

```
You: [вставляешь весь текст из WORKFLOW-PHASES.md]

Cursor: [дает детальный ответ с таблицами и примерами]

You: Спасибо! Можешь уточнить про Phase 2: Анализ индексов?

Cursor: [дает дополнительные детали]

You: Отлично! [сохраняешь в workflow-phases.md]
```

## Чеклист

- [ ] Выбрал вопрос из приоритета 1
- [ ] Скопировал вопрос в Cursor
- [ ] Получил ответ
- [ ] Сохранил в соответствующий файл
- [ ] Заполнил дату и статус
- [ ] Выделил ключевые моменты
- [ ] Записал идеи для применения
- [ ] Перешел к следующему вопросу

---

**Удачи в допросе! 🚀**
