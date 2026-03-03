# Simulation Validation

CLI-инструмент для валидации симуляций и схем протокола A2A.

## Установка зависимостей

Перед использованием убедитесь, что установлены зависимости:

```bash
cd a2a-server
npm install
```

Для работы AJV (Advanced JSON Schema Validator) убедитесь, что пакет установлен:

```bash
npm install ajv@^8.12.0 --save-dev
```

## Использование CLI

### Базовое использование

```bash
# Валидация конкретной симуляции
npm run sim:validate -- --sim coder/3

# Валидация всех симуляций
npm run sim:validate -- --all
```

### Опции CLI

| Опция | Описание |
|-------|----------|
| `--sim <name>` | Имя симуляции для валидации (например: `coder/3`, `fix-vue-imports`) |
| `--all` | Валидировать все симуляции |
| `--json, -j` | Вывод в формате JSON |
| `--verbose, -v` | Подробный вывод (включая предупреждения и список файлов) |
| `--help, -h` | Показать справку |

### Примеры

```bash
# Простая валидация
npm run sim:validate -- --sim coder/3

# Подробный вывод
npm run sim:validate -- --sim coder/3 --verbose

# JSON вывод для CI/CD
npm run sim:validate -- --sim coder/3 --json

# Валидация всех симуляций
npm run sim:validate -- --all --verbose
```

## Валидируемые файлы

Скрипт проверяет следующие файлы в директории симуляции:

| Файл | Схема | Обязательный |
|------|-------|--------------|
| `request.json` | [`server-invoke-request.schema.json`](json-schemas/server-invoke-request.schema.json) | Да |
| `response.json` | [`server-invoke-response-execute.schema.json`](json-schemas/server-invoke-response-execute.schema.json) | Да |
| `server-transforms-request.json` | [`server-transform.schema.json`](json-schemas/server-transform.schema.json) | Нет |
| `server-transforms-response.json` | [`server-transform.schema.json`](json-schemas/server-transform.schema.json) | Нет |

## Схемы JSON Schema

Схемы расположены в директории `docs/new-request-flow/json-schemas/`:

### Основные схемы

- **`server-invoke-request.schema.json`** - Схема для `request.json`
  - Валидирует структуру запроса к `/api/v1/invoke`
  - Поддерживает первый запрос (`task`) и последующие (`context` + `result`)

- **`server-invoke-response-execute.schema.json`** - Схема для `response.json`
  - Валидирует ответ сервера с `execute` блоком
  - Поддерживает все типы действий: `form`, `script`, `read-file`, `write-file`, `rag-search`, `execute-command`, `message`

- **`server-transform.schema.json`** - Схема для `server-transforms-*.json`
  - Валидирует pipeline трансформации
  - Поддерживает операции: `copy`, `set`, `append-to-array`, `parse-json-from-md`, `render-markdown`, `switch`

## CI интеграция

### Скрипты в package.json

```json
{
  "scripts": {
    "sim:validate": "tsx scripts/sim-validate.ts",
    "sim:validate:all": "tsx scripts/sim-validate.ts --all",
    "test:sim:validate": "tsx scripts/sim-validate.ts",
    "test:sim:validate:all": "tsx scripts/sim-validate.ts --all",
    "ci:validate": "npm run sim:validate:all",
    "ci:sim": "npm run sim:run-all"
  }
}
```

### Пример CI конфигурации (GitHub Actions)

```yaml
name: Validate Simulations

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd a2a-server
          npm install

      - name: Validate all simulations
        run: npm run ci:validate
        env:
          SKIP_AUTH: 1
```

### Пример Jenkinsfile

```groovy
pipeline {
    agent any

    stages {
        stage('Validate Simulations') {
            steps {
                dir('a2a-server') {
                    sh 'npm install'
                    sh 'npm run ci:validate'
                }
            }
        }
    }

    post {
        failure {
            echo 'Simulation validation failed!'
        }
    }
}
```

## Коды завершения

| Код | Описание |
|-----|----------|
| 0 | Валидация успешна |
| 1 | Ошибки валидации |

## Структура JSON вывода

При использовании `--json`:

```json
{
  "valid": true,
  "simulations": [
    {
      "name": "coder/3",
      "valid": true,
      "errors": [],
      "warnings": [],
      "files": [
        {
          "file": "request.json",
          "valid": true,
          "errors": []
        },
        {
          "file": "response.json",
          "valid": true,
          "errors": []
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Ошибка "Схема не найдена"

Убедитесь, что директория `docs/new-request-flow/json-schemas/` существует и содержит необходимые файлы схем.

### Ошибка AJV

Если возникает ошибка AJV, убедитесь что пакет установлен:

```bash
npm install ajv@^8.12.0 --save-dev
```

### Ошибка "Simulation directory not found"

Проверьте правильность пути к симуляции. Используйте формат `category/name` (например, `coder/3`).

## Разработка

### Добавление новой схемы

1. Создайте JSON Schema файл в `docs/new-request-flow/json-schemas/`
2. Добавьте конфигурацию в `FILE_TYPE_CONFIGS` в [`a2a-server/scripts/sim-validate.ts`](../../a2a-server/scripts/sim-validate.ts)

### Тестирование

```bash
# Тестирование конкретной симуляции
npm run sim:validate -- --sim coder/3 --verbose

# Тестирование всех симуляций
npm run sim:validate -- --all --verbose
```
