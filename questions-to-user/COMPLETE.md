# Questions-to-User System - Complete

## ✅ Система готова к использованию

### Файлы системы

```
✅ ask-question.ps1          - Основной скрипт (улучшенная версия)
✅ human-input.js             - Node.js wrapper
✅ example-usage.js           - Примеры использования
✅ .amazonq/questions-to-user/
   ✅ index.html              - Главная страница (все вопросы)
   ✅ question.html           - Страница одного вопроса
   ✅ server.php              - Backend с partial save
   ✅ questions.json          - Активные вопросы
   ✅ questions-test.json     - Тестовые вопросы
   ✅ README.md               - Документация
   ✅ USAGE-GUIDE.md          - Руководство по применению
   ✅ MANUAL-TEST.md          - Инструкции по тестированию
```

## Использование

### 1. Из PowerShell (прямой вызов)

```powershell
.\ask-question.ps1 -QuestionId "test-simple"
```

**Что происходит:**
1. Запускается PHP сервер на порту 8765
2. Открывается браузер с вопросом
3. Скрипт блокируется и ждет ответа
4. Человек отвечает за 3-10 секунд
5. Скрипт получает ответ и завершается
6. Выводит ответ в консоль и JSON

### 2. Из Node.js (через wrapper)

```javascript
const humanInput = require('./human-input');

// Простой вызов
const answer = await humanInput.ask('test-simple');
console.log('Answer:', answer);

// С таймаутом
const answer = await humanInput.ask('test-simple', 120);

// Множественные вопросы
const answers = await humanInput.askSequence(['q1', 'q2', 'q3']);
```

### 3. Пример AI агента

```javascript
async function aiAgentWorkflow() {
  console.log('🤖 Analyzing code...');
  
  // Критическая точка - нужно решение человека
  const answer = await humanInput.ask('refactor-confirm');
  
  if (answer === 'Yes, proceed') {
    console.log('🤖 Applying changes...');
    // Выполнить изменения
  } else {
    console.log('❌ Cancelled by user');
  }
}
```

## Возможности

### ✅ Реализовано

- [x] Индивидуальные кнопки сохранения для каждого вопроса
- [x] Страница просмотра одного вопроса (центрированная)
- [x] PowerShell скрипт с блокировкой до получения ответа
- [x] Автозапуск PHP сервера
- [x] Fallback на file:// URL если PHP недоступен
- [x] Попытка открыть в Edge → Chrome → Firefox → Default
- [x] Анимированный прогресс-бар
- [x] Процент выполнения
- [x] Логирование в ask-question.log
- [x] Настраиваемый порт и таймаут
- [x] Автоматическая остановка PHP сервера
- [x] Node.js wrapper для интеграции
- [x] Примеры использования
- [x] Полная документация

### Параметры скрипта

```powershell
.\ask-question.ps1 `
  -QuestionId "test-simple" `  # ID вопроса (обязательный)
  -Port 8765 `                  # Порт PHP сервера (по умолчанию 8765)
  -TimeoutSeconds 600           # Таймаут в секундах (по умолчанию 600)
```

## Тестирование

### Быстрый тест

```powershell
# 1. Скопировать тестовые вопросы
copy .amazonq\questions-to-user\questions-test.json .amazonq\questions-to-user\questions.json

# 2. Запустить тест
.\ask-question.ps1 -QuestionId "test-simple" -TimeoutSeconds 60

# 3. Ответить в браузере

# 4. Проверить лог
Get-Content .amazonq\questions-to-user\ask-question.log -Tail 10
```

### Node.js тест

```bash
node example-usage.js single
```

## Workflow Pattern

```
┌─────────────────────────────────────┐
│ AI Agent                             │
├─────────────────────────────────────┤
│ 1. Analyze code                      │
│ 2. Detect critical decision          │
│ 3. ⏸️  Call ask-question.ps1         │
│    ↓                                 │
│    [BLOCKED - Waiting...]            │
│    ↓                                 │
│    🌐 Browser opens                  │
│    👤 Human answers (5 sec)          │
│    ↓                                 │
│    ✅ Answer received                │
│ 4. Process answer                    │
│ 5. Continue execution                │
└─────────────────────────────────────┘
```

## Преимущества

1. **Синхронность** - AI блокируется до получения ответа
2. **Скорость** - человек отвечает за секунды
3. **Надежность** - 100% уверенность в критических решениях
4. **Гибкость** - любые типы вопросов
5. **Простота** - один вызов функции
6. **Автоматизация** - автозапуск сервера, fallback браузеров
7. **Логирование** - полная история вызовов
8. **Интеграция** - готовый Node.js wrapper

## Сценарии применения

### 1. Критические операции
- Удаление файлов
- Изменение архитектуры
- Рефакторинг публичных API

### 2. Выбор стратегии
- Несколько равнозначных подходов
- Оптимизация vs читаемость
- Технические решения

### 3. Итеративное уточнение
- Генерация кода → проверка → уточнение
- Цикл вопрос-ответ
- Постепенное улучшение

### 4. Разрешение конфликтов
- Merge conflicts
- Противоречивые требования
- Приоритизация задач

## Следующие шаги

Система полностью готова. Для использования:

1. **Создайте вопросы** в `questions.json`
2. **Вызовите скрипт** из AI агента
3. **Получите ответ** и продолжайте работу

Готово! 🚀
