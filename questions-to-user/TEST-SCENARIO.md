# Test Scenario & Improvements

## Тестовый сценарий

### Шаг 1: Создать тестовый вопрос

```json
{
  "sessionId": "test-session",
  "createdAt": "2024-01-15T12:00:00Z",
  "context": "Testing ask-question.ps1 script functionality",
  "groups": [
    {
      "title": "Quick Test",
      "questions": [
        {
          "id": "test-q1",
          "type": "radio",
          "question": "Should I proceed with the refactoring?",
          "options": [
            "Yes, proceed",
            "No, cancel",
            "Show me details first"
          ]
        }
      ]
    }
  ]
}
```

### Шаг 2: Запустить скрипт

```powershell
# В PowerShell
cd C:\workspace\org-carrier\domain-platform\markdown-pipeline-automator
.\ask-question.ps1 -QuestionId "test-q1"
```

### Шаг 3: Проверить результат

Ожидаемый вывод:
```
Opening question: test-q1
URL: file:///C:/workspace/.../question.html?id=test-q1&autoClose=true

Waiting for answer...
Press Ctrl+C to cancel
..........
✓ Answer received!

Question ID: test-q1
Answer:
  Yes, proceed

JSON Output:
{"questionId":"test-q1","answer":"Yes, proceed","timestamp":"2024-01-15T12:34:56.789Z"}
```

## Обнаруженные проблемы и улучшения

### Проблема 1: PHP сервер не запущен
**Симптом:** Browser открывается, но не может загрузить вопросы

**Решение:** Добавить автозапуск PHP сервера в скрипт

### Проблема 2: Путь к файлу в URL
**Симптом:** `file:///` URL может не работать с PHP

**Решение:** Использовать локальный HTTP сервер

### Проблема 3: Нет визуальной обратной связи
**Симптом:** Непонятно, что скрипт ждет ответа

**Решение:** Добавить прогресс-бар и звуковое уведомление

### Проблема 4: Нет логирования
**Симптом:** Сложно отладить проблемы

**Решение:** Добавить подробное логирование

### Проблема 5: Нет обработки Edge не установлен
**Симптом:** Ошибка если Edge отсутствует

**Решение:** Fallback на другие браузеры

## Улучшенная версия скрипта

Создам улучшенную версию с исправлениями всех проблем.
