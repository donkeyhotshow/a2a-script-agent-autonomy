# @a2a/script-runner

Пакет для безопасного выполнения TypeScript/JavaScript кода в изолированной sandbox-среде (VM2). Используется для
выполнения скриптов из MD-файлов действий на клиенте a2a-client.

## Назначение

- Выполнение пользовательских скриптов в изолированной среде
- Поддержка TypeScript (базовая транспиляция)
- Безопасное выполнение с ограниченным доступом к модулям
- Кэширование скриптов для повторного использования

## API

### `executeScript(code, input, context)`

Выполняет JavaScript/TypeScript код в sandbox.

```javascript
import { executeScript } from '@a2a/script-runner';

const result = await executeScript(
  `const run = async (input) => {
    return { message: 'Hello, ' + input.name };
  };`,
  { name: 'World' },
  { sessionId: 'session-123', workingDir: '/project' }
);

console.log(result);
// { success: true, data: { message: 'Hello, World' }, duration_ms: 5 }
```

**Параметры:**

| Параметр  | Тип             | Описание                                        |
|-----------|-----------------|-------------------------------------------------|
| `code`    | `string`        | Код для выполнения                              |
| `input`   | `Object`        | Входные данные, доступные как `input` в скрипте |
| `context` | `ScriptContext` | Контекст выполнения                             |

**ScriptContext:**

```typescript
interface ScriptContext {
  sessionId: string;           // Идентификатор сессии
  workingDir: string;          // Рабочая директория (для Node.js)
  aliases?: Record<string, string>;  // Псевдонимы путей
  previousOutput?: any;        // Результат предыдущего шага
}
```

**Возвращаемое значение:**

```typescript
interface ScriptResult {
  success: boolean;    // Успешность выполнения
  data?: any;          // Результат (если success: true)
  error?: string;      // Сообщение об ошибке (если success: false)
  duration_ms: number; // Время выполнения в миллисекундах
}
```

### Класс `ScriptRunner`

Класс для управления регистрацией и выполнением скриптов.

```javascript
import { ScriptRunner } from '@a2a/script-runner';

const runner = new ScriptRunner();

// Регистрация скрипта
runner.registerScript('my-script', `
  const run = async (input) => {
    return input.value * 2;
  };
`);

// Проверка наличия скрипта
runner.hasScript('my-script'); // true

// Выполнение зарегистрированного скрипта
const result = await runner.run('my-script', { value: 21 }, context);
// { success: true, data: 42, duration_ms: 3 }

// Очистка кэша
runner.clear();
```

### Синглтон `scriptRunner`

Экспортируется готовый экземпляр `ScriptRunner`:

```javascript
import scriptRunner from '@a2a/script-runner';

await scriptRunner.run('script-id', input, context);
```

## Примеры использования

### Простой синхронный код

```javascript
const result = await executeScript(`
  const run = (input) => {
    return input.x + input.y;
  };
`, { x: 10, y: 20 }, context);
// result.data === 30
```

### Асинхронная функция

```javascript
const result = await executeScript(`
  const run = async (input) => {
    // Асинхронные операции
    await new Promise(r => setTimeout(r, 100));
    return { processed: true, items: input.items.length };
  };
`, { items: [1, 2, 3] }, context);
// result.data === { processed: true, items: 3 }
```

### Использование безопасных модулей Node.js

```javascript
const result = await executeScript(`
  const fs = require('fs');
  const path = require('path');
  
  const run = async (input) => {
    const filePath = path.join(input.rootDir, 'package.json');
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  };
`, {}, { sessionId: 's1', workingDir: '/project' });
```

### Обработка ошибок

```javascript
const result = await executeScript(`
  const run = (input) => {
    throw new Error('Something went wrong');
  };
`, {}, context);

console.log(result);
// { success: false, error: 'Something went wrong', duration_ms: 1 }
```

## Безопасность (VM2 Sandbox)

### Изолированная среда

Скрипты выполняются в виртуальной машине VM2, которая обеспечивает:

- **Изоляция памяти** — скрипт не имеет доступа к области видимости хоста
- **Ограничение времени** — таймаут выполнения 30 секунд по умолчанию
- **Контроль модулей** — доступ только к разрешённым Node.js модулям

### Разрешённые модули

Только следующие модули Node.js доступны в sandbox:

- `fs` — файловая система
- `path` — работа с путями
- `util` — утилиты
- `crypto` — криптография
- `buffer` — буферы
- `stream` — потоки
- `events` — события

Попытка подключить другой модуль вызовет ошибку:

```javascript
const result = await executeScript(`
  const http = require('http'); // Ошибка!
`, {}, context);
// result.error === "Module 'http' is not allowed in sandbox"
```

### Ограничения

1. **Таймаут**: 30 секунд на выполнение
2. **Нет доступа к сети**: модули `http`, `https`, `net` заблокированы
3. **Нет доступа к процессу**: `process` недоступен
4. **Ограниченный console**: перенаправляется в логи с префиксом `[Script]`

### Рекомендации

- Всегда проверяйте `result.success` перед использованием `result.data`
- Используйте `try-catch` внутри скриптов для обработки ожидаемых ошибок
- Не передавайте чувствительные данные через `input` без необходимости

## Установка

```bash
npm install @a2a/script-runner
```

## Зависимости

- `vm2` ^3.9.19 — виртуальная машина для изолированного выполнения кода

## Лицензия

MIT
