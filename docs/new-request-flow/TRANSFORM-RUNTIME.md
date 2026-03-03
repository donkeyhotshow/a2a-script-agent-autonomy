# Transform Runtime

Модуль runtime для выполнения JSON transform pipelines, определённых в [`server-transform.schema.json`](json-schemas/server-transform.schema.json).

## Обзор

Transform Runtime — это библиотека для декларативного преобразования JSON документов с использованием JSONPath. Она используется в A2A протоколе для трансформации данных между этапами симуляции.

## Установка

```bash
cd a2a-server
npm install jsonpath-plus
```

## Использование

### Базовое использование

```typescript
import { runTransformPipeline, loadTransformPipeline } from './src/transform/index.js';

// Загрузка pipeline из файла
const pipeline = await loadTransformPipeline('simulations/coder/3/server-transforms-response.json');

// Выполнение трансформации
const input = { context: { task: 'test' } };
const result = await runTransformPipeline(pipeline, input);

console.log(result.output); // transformed output
console.log(result.success); // true/false
```

### Использование с файлами

```typescript
import { runTransformPipelineFromFile } from './src/transform/index.js';

const result = await runTransformPipelineFromFile(
  'simulations/coder/3/server-transforms-response.json',
  { context: { task: 'test' } },
  { baseDir: '/path/to/simulations/coder/3' }
);

console.log(result.files); // { 'request.md': '...', ... }
```

## API

### runTransformPipeline

Выполняет transform pipeline на входном документе.

```typescript
function runTransformPipeline(
  pipeline: TransformPipeline,
  input: Record<string, unknown>,
  options?: TransformOptions
): Promise<TransformResult>
```

**Параметры:**

- `pipeline` - Определение pipeline (загруженное из JSON)
- `input` - Входной JSON документ
- `options` - Дополнительные опции:
  - `baseDir` - Базовая директория для file I/O операций
  - `fs` - Кастомная реализация файловой системы
  - `renderTemplate` - Кастомный рендер шаблонов

**Возвращает:**

- `TransformResult` - Результат трансформации:
  - `output` - Трансформированный JSON документ
  - `files` - Записанные файлы (опционально)
  - `success` - Успешность трансформации
  - `error` - Сообщение об ошибке (если failed)

### loadTransformPipeline

Загружает pipeline из JSON файла.

```typescript
function loadTransformPipeline(filePath: string): Promise<TransformPipeline>
```

### runTransformPipelineFromFile

Загружает и выполняет pipeline из файла.

```typescript
function runTransformPipelineFromFile(
  pipelinePath: string,
  input: Record<string, unknown>,
  options?: TransformOptions
): Promise<TransformResult>
```

### loadSimulationTransform

Загружает transform для симуляции.

```typescript
async function loadSimulationTransform(
  simulationDir: string,
  type: 'request' | 'response'
): Promise<TransformPipeline | null>
```

### runSimulationTransform

Выполняет transform для шага симуляции.

```typescript
async function runSimulationTransform(
  simulationDir: string,
  input: Record<string, unknown>,
  type: 'request' | 'response',
  options?: TransformOptions
): Promise<TransformResult>
```

### validatePipeline

Валидирует pipeline и возвращает массив ошибок.

```typescript
function validatePipeline(pipeline: unknown): string[]
```

## Поддерживаемые операции

### copy

Копирует данные из одного JSONPath в другой.

```json
{
  "op": "copy",
  "from": "$.context",
  "to": "$.context"
}
```

### set

Устанавливает значение по JSONPath.

```json
{
  "op": "set",
  "path": "$.result",
  "value": {
    "completed": true
  }
}
```

С использованием `valueFrom`:

```json
{
  "op": "set",
  "path": "$.execute",
  "valueFrom": "$.llm.params"
}
```

### append-to-array

Добавляет значение в массив.

```json
{
  "op": "append-to-array",
  "to": "$.context.history",
  "value": {
    "role": "assistant",
    "message": "$.llm.message"
  }
}
```

Поддерживает template placeholders: `$.path.to.value`

### parse-json-from-md

Читает markdown файл и извлекает JSON.

```json
{
  "op": "parse-json-from-md",
  "fromFile": "response.md",
  "jsonPath": "$",
  "to": "$llm"
}
```

Извлекает JSON из markdown (ищет ` ```json ... ``` ` блоки).

### render-markdown

Рендерит markdown шаблон с данными.

```json
{
  "op": "render-markdown",
  "templateRef": "simulations/coder/3/request.md",
  "data": "$out",
  "outputFile": "request.md"
}
```

Заменяет `{{path}}` плейсхолдеры значениями из контекста.

### switch

Условная трансформация на основе значения дискриминатора.

```json
{
  "op": "switch",
  "discriminator": "$.llm.action",
  "cases": {
    "rag-search": {
      "op": "set",
      "path": "$.execute",
      "value": {
        "rag-search": {
          "query": "$.llm.params.query"
        }
      }
    },
    "read-file": {
      "op": "set",
      "path": "$.execute",
      "value": {
        "read-file": {
          "path": "$.llm.params.file"
        }
      }
    }
  },
  "default": {
    "op": "set",
    "path": "$.execute",
    "value": {
      "message": "Unknown action"
    }
  }
}
```

## Template Placeholders

В значениях операций можно использовать плейсхолдеры:

- `$.path.to.value` — ссылка на значение в контексте
- `${path.to.value}` — альтернативный синтаксис в строках

Пример:

```json
{
  "op": "append-to-array",
  "to": "$.context.history",
  "value": {
    "role": "assistant",
    "message": "$.llm.message",
    "action": "$.llm.action"
  }
}
```

## JSONPath

Используется библиотека [jsonpath-plus](https://www.npmjs.com/package/jsonpath-plus) с расширенным синтаксисом JSONPath.

Основные примеры:

| JSONPath | Описание |
|----------|----------|
| `$` | Корень документа |
| `$.key` | Доступ к ключу |
| `$.parent.child` | Вложенные ключи |
| `$.array[0]` | Элемент массива |
| `$.array[*]` | Все элементы массива |
| `$..key` | Рекурсивный поиск |
| `$out` | Выходной документ в контексте |

## Обработка ошибок

```typescript
const result = await runTransformPipeline(pipeline, input);

if (!result.success) {
  console.error('Transform failed:', result.error);
}
```

## Примеры использования

### Трансформация ответа LLM

```typescript
import { runSimulationTransform } from './src/transform/index.js';

// Трансформируем response.json -> response.json (post-LLM)
const responseInput = await loadJson('response.json');
const responseResult = await runSimulationTransform(
  'simulations/coder/3',
  responseInput,
  'response'
);

// Трансформируем request.json -> request.md (pre-LLM)
const requestInput = await loadJson('request.json');
const requestResult = await run 'simulations/cSimulationTransform(
 oder/3',
  requestInput,
  'request'
);
```

### Кастомная файловая система

```typescript
import { runTransformPipeline } from './src/transform/index.js';

const customFs = {
  readFile: async (path) => { /* custom read */ },
  writeFile: async (path, content) => { /* custom write */ },
  exists: async (path) => { /* custom exists */ }
};

const result = await runTransformPipeline(
  pipeline,
  input,
  { fs: customFs }
);
```

## Файловая структура модуля

```
src/transform/
├── index.ts        # Экспорты модуля
├── types.ts        # TypeScript типы
├── jsonpath.ts     # Утилиты JSONPath
├── operations.ts   # Реализация операций
└── pipeline.ts     # Основной runner
```

## Схема

Полная схема pipeline определена в [`json-schemas/server-transform.schema.json`](json-schemas/server-transform.schema.json).

Валидация:

```typescript
import Ajv from 'ajv';
import schema from './json-schemas/server-transform.schema.json';

const ajv = new Ajv();
const validate = ajv.compile(schema);

const isValid = validate(pipeline);
if (!isValid) {
  console.error('Validation errors:', validate.errors);
}
```
