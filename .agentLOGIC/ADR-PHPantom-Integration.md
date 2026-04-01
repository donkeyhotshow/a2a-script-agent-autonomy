# ADR: Интеграция PHPantom LSP в A2A Script Agent

- **Статус**: Предложено
- **Дата**: 2026-04-01
- **Контекст**: Для глубокого понимания PHP-проектов агенту требуется не просто чтение файлов, а семантический анализ (типы, зависимости, переходы). PHPantom — это сверхбыстрый (Rust) LSP-сервер, который идеально подходит для этой задачи.

## Решение

Интегрировать PHPantom как специализированный инструмент (Skill) для анализа PHP-кода.

### 1. Архитектура вызова
Агент будет вызывать бинарный файл `phpantom_lsp` в CLI-режиме для получения отчетов и автоматических правок.

### 2. Примеры использования (Action-Key Shape)

#### Поиск ошибок (Analyze)
```json
{
  "execute": {
    "phpantom-analyze": {
      "path": "src/Controller/UserController.php",
      "severity": "warning"
    }
  }
}
```

#### Автоматическое исправление (Fix)
```json
{
  "execute": {
    "phpantom-fix": {
      "path": "src/",
      "rules": ["unused_import"]
    }
  }
}
```

### 3. Пример реализации обработчика (Node.js)

```javascript
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

export async function handlePHPantomAnalyze({ execute }) {
  const { path, severity = 'all' } = execute['phpantom-analyze'];
  
  // Путь к бинарнику в папке .agentLOGIC
  const binPath = './.agentLOGIC/phpantom_lsp-main/target/release/phpantom_lsp';
  
  try {
    const { stdout } = await execAsync(`${binPath} analyze ${path} --severity ${severity} --no-colour`);
    return {
      result: {
        "phpantom-analyze": {
          report: stdout,
          status: "success"
        }
      }
    };
  } catch (error) {
    return {
      result: {
        "phpantom-analyze": {
          report: error.stdout || error.message,
          status: "found_issues"
        }
      }
    };
  }
}
```

## Последствия

- **Плюсы**:
    - Моментальный анализ (до 1сек на проект).
    - Минимальное потребление RAM (60MB).
    - Высокая точность рефакторинга (удаление неиспользуемых импортов, поиск неопределенных классов).
- **Риски**:
    - Зависимость от скомпилированного бинарного файла под конкретную ОС (Windows).
    - Необходимость наличия PHP на машине для полной работы парсера.
