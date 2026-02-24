# Manual Testing Instructions

## Подготовка

1. Убедитесь, что PHP установлен:
```powershell
php -v
```

2. Скопируйте тестовые вопросы:
```powershell
Copy-Item .amazonq\questions-to-user\questions-test.json .amazonq\questions-to-user\questions.json
```

## Тест 1: Базовая функциональность

### Запуск оригинального скрипта:
```powershell
.\ask-question.ps1 -QuestionId "test-simple"
```

**Ожидаемое поведение:**
1. Открывается браузер Edge
2. Показывается вопрос "Should I proceed with this test?"
3. Выбираете "Yes, proceed"
4. Нажимаете "Save Answer"
5. Окно закрывается
6. Скрипт выводит ответ и завершается

## Тест 2: Улучшенная версия

### Запуск улучшенного скрипта:
```powershell
.\ask-question-v2.ps1 -QuestionId "test-simple"
```

**Новые возможности:**
1. ✅ Автозапуск PHP сервера
2. ✅ Анимированный прогресс-бар
3. ✅ Логирование в ask-question.log
4. ✅ Fallback на другие браузеры
5. ✅ Настраиваемый таймаут

### С параметрами:
```powershell
.\ask-question-v2.ps1 -QuestionId "test-simple" -Port 9000 -TimeoutSeconds 300
```

## Тест 3: Множественный выбор

```powershell
.\ask-question-v2.ps1 -QuestionId "test-multi"
```

**Проверка:**
- Выберите несколько опций
- Ответ должен быть массивом

## Тест 4: Текстовый ввод

```powershell
.\ask-question-v2.ps1 -QuestionId "test-text"
```

**Проверка:**
- Введите текст
- Ответ должен быть строкой

## Тест 5: Таймаут

```powershell
.\ask-question-v2.ps1 -QuestionId "test-simple" -TimeoutSeconds 10
```

**Проверка:**
- НЕ отвечайте на вопрос
- Через 10 секунд скрипт должен завершиться с ошибкой

## Тест 6: Интеграция с Node.js

Создайте файл `test-integration.js`:

```javascript
const { execSync } = require('child_process');

async function testAskQuestion() {
  console.log('🤖 Starting test...');
  
  try {
    const result = execSync(
      'powershell -File ask-question-v2.ps1 -QuestionId "test-simple"',
      { encoding: 'utf8', timeout: 60000 }
    );
    
    console.log('Raw output:', result);
    
    const jsonMatch = result.match(/\{.*\}/);
    if (jsonMatch) {
      const answer = JSON.parse(jsonMatch[0]);
      console.log('✅ Answer received:', answer);
      
      if (answer.answer === 'Yes, proceed') {
        console.log('✅ Test passed!');
      } else {
        console.log('❌ Unexpected answer');
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAskQuestion();
```

Запуск:
```powershell
node test-integration.js
```

## Проверка логов

```powershell
Get-Content .amazonq\questions-to-user\ask-question.log -Tail 20
```

## Проверка ответов

```powershell
Get-Content .amazonq\questions-to-user\answers.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## Сравнение версий

| Функция | ask-question.ps1 | ask-question-v2.ps1 |
|---------|------------------|---------------------|
| Открытие браузера | ✅ Edge only | ✅ Edge/Chrome/Firefox/Default |
| PHP сервер | ❌ file:// URL | ✅ Auto-start |
| Прогресс | ❌ Точки каждые 10 сек | ✅ Анимация каждую сек |
| Логирование | ❌ Нет | ✅ ask-question.log |
| Таймаут | ✅ 600 сек | ✅ Настраиваемый |
| Порт | ❌ Нет | ✅ Настраиваемый |
| Cleanup | ❌ Нет | ✅ Останавливает PHP |
| Процент выполнения | ❌ Нет | ✅ Показывает % |

## Рекомендации после тестирования

После успешного тестирования:

1. Заменить оригинальный скрипт:
```powershell
Move-Item ask-question.ps1 ask-question-old.ps1
Move-Item ask-question-v2.ps1 ask-question.ps1
```

2. Обновить документацию

3. Добавить в .gitignore:
```
.amazonq/questions-to-user/ask-question.log
.amazonq/questions-to-user/answers.json
```

## Troubleshooting

### PHP не найден
```powershell
# Установить PHP или добавить в PATH
# Скрипт автоматически fallback на file:// URL
```

### Браузер не открывается
```powershell
# Проверить доступные браузеры
Get-Command msedge.exe, chrome.exe, firefox.exe
```

### Порт занят
```powershell
# Использовать другой порт
.\ask-question-v2.ps1 -QuestionId "test-simple" -Port 9000
```

### Ответ не сохраняется
```powershell
# Проверить права на запись
Test-Path .amazonq\questions-to-user\answers.json
```
