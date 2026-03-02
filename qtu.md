# QTU - Question to User

Инструмент для задавания вопросов пользователю через веб-интерфейс.

## Установка

Скрипт [`qtu.ps1`](C:/workspace/bin/qtu.ps1) должен быть доступен в PATH системы.

## Использование

### Базовый вызов

```powershell
qtu -Question "Ваш вопрос?"
```

### С вариантами выбора

```powershell
qtu -Question "Какой язык?" -Options "Python,JavaScript,C#"
```

При выборе вариантов автоматически добавляется опция "Свой вариант".

### С указанием порта

```powershell
qtu -Question "Ваш вопрос?" -Port 9000
```

По умолчанию используется порт 8765.

### С указанием таймаута

```powershell
qtu -Question "Ваш вопрос?" -Timeout 300
```

По умолчанию таймаут = 600 секунд.

## Параметры

| Параметр | Описание | По умолчанию |
|----------|----------|--------------|
| `-Question` | Текст вопроса (обязательный) | - |
| `-Options` | Варианты ответа через запятую | нет |
| `-Port` | Порт PHP сервера | 8765 |
| `-Timeout` | Таймаут в секундах | 600 |

## Примеры

```powershell
# Простой текстовый вопрос
qtu -Question "Как дела?"

# Вопрос с вариантами выбора
qtu -Question "Какой язык?" -Options "Python,JavaScript,C#"

# С указанием порта и таймаута
qtu -Question "Ваш вопрос?" -Port 9000 -Timeout 120
```

## Требования

- PHP должен быть установлен и доступен в PATH
- Браузер по умолчанию (Edge/Chrome/Firefox)

## Файлы

- `questions-to-user/questions.json` - Все вопросы (JSON)
- `questions-to-user/questions/q_*.json` - Отдельный файл вопроса
- `questions-to-user/answers.json` - Ответы пользователя
- `questions-to-user/qtu.log` - Лог работы скрипта

## Как это работает

1. Скрипт сохраняет вопрос в JSON файл
2. Запускает PHP сервер на указанном порту
3. Открывает браузер с веб-формой вопроса
4. Ожидает ответа пользователя (или таймаута)
5. Возвращает JSON с ответом

## Вызов из кода

```typescript
// Пример вызова qtu из Node.js
import { exec } from 'child_process';

function askUser(question: string, options?: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const opts = options ? `-Options "${options.join(',')}"` : '';
    const cmd = `powershell -ExecutionPolicy Bypass -Command "qtu -Question '${question}' ${opts}"`;
    
    exec(cmd, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      
      // Парсинг JSON ответа из stdout
      const jsonMatch = stdout.match(/\{.*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        resolve(result.answer);
      } else {
        reject(new Error('Не удалось получить ответ'));
      }
    });
  });
}

// Использование
const answer = await askUser('Какой язык?', ['Python', 'JavaScript', 'C#']);
```
