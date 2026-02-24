# Questions to User System

## Overview

Система для синхронного взаимодействия AI агента с человеком через браузерный интерфейс.

**Ключевая особенность:** AI агент блокируется и ждет ответа от человека, затем продолжает выполнение с полученным ответом.

## ⚠️ ВАЖНО: Правила формулировки вопросов

### ❌ НЕ СПРАШИВАТЬ:
- Критичность/срочность (всегда критично, всегда на вчера)
- Правильность выполненной работы (что сделано - то сделано)
- Подтверждение очевидного (если дошли - делаем)
- Время и ресурсы (делаем быстро и качественно)

### ✅ СПРАШИВАТЬ ТОЛЬКО:
- Выбор стратегии (несколько равнозначных вариантов)
- Критические операции (необратимые, высокий риск)
- Бизнес-решения (влияют на продукт)
- Технические развилки (разные последствия)
- Конфликты и неоднозначности

**Принцип:** "Делай, не спрашивай". Лучше сделать и откатить, чем спросить и ждать.

**Полные правила:** `.amazonq/rules/QUESTION-RULES.md`

## Quick Start

### 1. Из PowerShell
```powershell
.\ask-question.ps1 -QuestionId "test-simple"
```

### 2. Из Node.js
```javascript
const humanInput = require('./human-input');
const answer = await humanInput.ask('test-simple');
console.log('User answered:', answer);
```

### 3. Пример использования
```bash
node example-usage.js single
```

## Улучшения

### 1. Индивидуальное сохранение вопросов
Каждый вопрос теперь имеет свою кнопку "Save", позволяющую сохранять ответы по отдельности.

### 2. Страница просмотра одного вопроса
`question.html` - отдельная страница для отображения одного вопроса по центру экрана с крупным шрифтом.

**Параметры URL:**
- `id` - ID вопроса (обязательный)
- `autoClose=true` - автоматически закрыть окно после сохранения

**Пример:**
```
question.html?id=q1&autoClose=true
```

### 3. PowerShell скрипт для автоматизации

`ask-question.ps1` - скрипт для открытия вопроса и ожидания ответа.

**Использование:**
```powershell
# Из корня проекта
.\ask-question.ps1 -QuestionId "q1"

# Или с полным путем
powershell -File "C:\path\to\project\ask-question.ps1" -QuestionId "q1"
```

**Что делает скрипт:**
1. Открывает вопрос в MS Edge в новом окне
2. Блокируется и ждет ответа (до 10 минут)
3. Опрашивает `answers.json` каждую секунду
4. При получении ответа:
   - Выводит вопрос и ответ в консоль
   - Выводит JSON для программного использования
   - Завершается с кодом 0
5. При таймауте завершается с кодом 1

**Пример вывода:**
```
Opening question: q1
URL: file:///C:/project/.amazonq/questions-to-user/question.html?id=q1&autoClose=true

Waiting for answer...
Press Ctrl+C to cancel
..........
✓ Answer received!

Question ID: q1
Answer:
  Отдельные папки: /local и /server в корне

JSON Output:
{"questionId":"q1","answer":"Отдельные папки: /local и /server в корне","timestamp":"2024-01-15T12:34:56.789Z"}
```

## Структура файлов

```
.amazonq/questions-to-user/
├── index.html          # Главная страница (все вопросы)
├── question.html       # Страница одного вопроса
├── server.php          # Backend (partial save support)
├── questions.json      # Определения вопросов
├── questions-test.json # Тестовые вопросы
├── answers.json        # Сохраненные ответы (auto-generated)
├── ask-question.log    # Лог выполнения (auto-generated)
├── README.md           # Эта документация
├── USAGE-GUIDE.md      # Руководство по применению
└── MANUAL-TEST.md      # Инструкции по тестированию

ask-question.ps1        # PowerShell скрипт
human-input.js          # Node.js wrapper
example-usage.js        # Примеры использования
```

## API Changes

### server.php

**Новый формат для частичного сохранения:**
```json
POST /server.php
{
  "sessionId": "session-id",
  "questionId": "q1",
  "answer": "value",
  "partial": true
}
```

**Формат answers.json:**
```json
{
  "sessionId": "session-id",
  "lastUpdated": "2024-01-15T12:34:56Z",
  "answers": {
    "q1": "answer1",
    "q2": ["option1", "option2"],
    "q3": "answer3"
  }
}
```

## Node.js Integration

### Simple usage
```javascript
const humanInput = require('./human-input');

const answer = await humanInput.ask('question-id');
console.log('Answer:', answer);
```

### With timeout
```javascript
const answer = await humanInput.ask('question-id', 120); // 2 minutes
```

### Multiple questions
```javascript
const answers = await humanInput.askSequence(['q1', 'q2', 'q3']);
console.log(answers); // { q1: 'answer1', q2: 'answer2', q3: 'answer3' }
```

### Error handling
```javascript
try {
  const answer = await humanInput.ask('question-id');
  // Process answer
} catch (error) {
  console.error('Failed to get answer:', error.message);
  // Fallback logic
}
```

### PowerShell
```powershell
# Вызов из другого скрипта
$result = & .\ask-question.ps1 -QuestionId "q1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: $result"
} else {
    Write-Host "Failed or timeout"
}
```

### Batch/CMD
```batch
@echo off
powershell -File ask-question.ps1 -QuestionId "q1"
if %ERRORLEVEL% EQU 0 (
    echo Answer received
) else (
    echo Failed or timeout
)
```

## Workflow Examples

### Пример 1: Последовательные вопросы
```powershell
$questions = @("q1", "q2", "q3")
$answers = @{}

foreach ($qid in $questions) {
    Write-Host "Asking question $qid..."
    $result = & .\ask-question.ps1 -QuestionId $qid
    
    if ($LASTEXITCODE -eq 0) {
        $json = $result | ConvertFrom-Json
        $answers[$qid] = $json.answer
    } else {
        Write-Host "Skipping $qid (timeout or cancelled)"
    }
}

Write-Host "All answers collected:"
$answers | ConvertTo-Json
```

### Пример 2: Условные вопросы
```powershell
# Спросить q1
$result = & .\ask-question.ps1 -QuestionId "q1"
$answer1 = ($result | ConvertFrom-Json).answer

# Если ответ содержит "server", спросить q2
if ($answer1 -like "*server*") {
    & .\ask-question.ps1 -QuestionId "q2"
}
```

### Пример 3: Интеграция с Node.js workflow
```javascript
// workflow.js
const { execSync } = require('child_process');

async function runWorkflow() {
  console.log('Step 1: Analyze code...');
  // ... code analysis
  
  console.log('Step 2: Ask user for confirmation...');
  try {
    const result = execSync(
      'powershell -File ask-question.ps1 -QuestionId "confirm-refactor"',
      { encoding: 'utf8', timeout: 600000 }
    );
    
    const answer = JSON.parse(result.match(/\{.*\}/)[0]);
    
    if (answer.answer === 'Yes') {
      console.log('Step 3: Apply refactoring...');
      // ... apply changes
    } else {
      console.log('Cancelled by user');
    }
  } catch (error) {
    console.error('Failed to get user input:', error.message);
  }
}

runWorkflow();
```

## Testing

### Запуск тестов
```powershell
# Скопировать тестовые вопросы
copy .amazonq\questions-to-user\questions-test.json .amazonq\questions-to-user\questions.json

# Тест 1: Простой вопрос
.\ask-question.ps1 -QuestionId "test-simple"

# Тест 2: Множественный выбор
.\ask-question.ps1 -QuestionId "test-multi"

# Тест 3: Текстовый ввод
.\ask-question.ps1 -QuestionId "test-text"

# Тест 4: Node.js интеграция
node example-usage.js single

# Тест 5: Множественные вопросы
node example-usage.js multi
```

### Проверка логов
```powershell
Get-Content .amazonq\questions-to-user\ask-question.log -Tail 20
```

## Troubleshooting

### PHP не найден
**Решение:** Скрипт автоматически использует file:// URL

### Браузер не открывается
**Решение:** Скрипт пробует Edge → Chrome → Firefox → Default browser

### Порт занят
```powershell
.\ask-question.ps1 -QuestionId "test" -Port 9000
```

### Таймаут
```powershell
.\ask-question.ps1 -QuestionId "test" -TimeoutSeconds 300
```

## Advanced Usage

См. **USAGE-GUIDE.md** для:
- Интеграция с AI агентами
- Workflow patterns
- Best practices
- Примеры кода
