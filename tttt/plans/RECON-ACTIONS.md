# Recon Actions - разведка "дикого кода"

## scan-wild-project

**Описание**: Сканирование проекта для поиска интересного кода

**Input**:
```json
{
  "projectPath": "/path/to/project",
  "maxFiles": 30,
  "deepAnalysis": false,
  "useCache": true
}
```

**Output**:
```json
{
  "graph": { "nodes": [], "edges": [], "metrics": {} },
  "entryPoints": [],
  "candidates": [
    {
      "path": "/full/path",
      "relativePath": "src/file.js",
      "score": 25,
      "metrics": { "inDegree": 3, "outDegree": 5 },
      "intent": {
        "intents": [{ "type": "unfinished", "confidence": 0.7 }],
        "ideas": ["TODO: implement feature X"]
      }
    }
  ]
}
```

**Module**: `terminator/modules/recon-indexer/pipeline`

**Example**:
```javascript
const { ReconPipeline } = require('./terminator/modules/recon-indexer');
const pipeline = new ReconPipeline();
const results = await pipeline.scan('/path/to/project', { maxFiles: 30 });
```

---

## generate-recon-report

**Описание**: Генерация markdown отчёта по результатам разведки

**Input**:
```json
{
  "results": { "graph": {}, "entryPoints": [], "candidates": [] }
}
```

**Output**: Markdown string

**Module**: `terminator/modules/recon-indexer/pipeline`

**Example**:
```javascript
const report = pipeline.generateReport(results);
fs.writeFileSync('RECON-REPORT.md', report);
```

---

## batch-scan-projects

**Описание**: Пакетное сканирование множества проектов

**Input**:
```json
{
  "projectPaths": ["/path/1", "/path/2"],
  "options": { "maxFiles": 20, "deepAnalysis": false }
}
```

**Output**:
```json
{
  "results": [
    { "project": "project1", "files": 150, "candidates": 20, "topScore": 35 },
    { "project": "project2", "error": "Not found" }
  ]
}
```

**Module**: Custom batch processor

**Example**:
```bash
node recon-batch.js
```

---

## parallel-scan-projects

**Описание**: Параллельное сканирование с worker threads

**Input**:
```json
{
  "projectPaths": ["/path/1", "/path/2", "/path/3"],
  "concurrency": 3,
  "options": { "maxFiles": 20 }
}
```

**Output**: Same as batch-scan-projects

**Module**: Worker threads

**Example**:
```bash
node recon-parallel.js
```

---

## clear-recon-cache

**Описание**: Очистка кэша разведки

**Input**:
```json
{
  "projectPath": "/path/to/project"
}
```

**Output**: `{ "success": true }`

**Module**: `terminator/modules/recon-indexer/cache-manager`

**Example**:
```javascript
const { CacheManager } = require('./terminator/modules/recon-indexer');
const cache = new CacheManager();
cache.clear('/path/to/project');
```

---

## detect-file-intent

**Описание**: Определение намерений разработчика для конкретного файла

**Input**:
```json
{
  "filePath": "/path/to/file.js",
  "content": "file content"
}
```

**Output**:
```json
{
  "intents": [
    { "type": "stub", "confidence": 0.8 },
    { "type": "unfinished", "confidence": 0.7 }
  ],
  "ideas": [
    "TODO: implement authentication",
    "FIXME: handle edge cases"
  ]
}
```

**Module**: `terminator/modules/recon-indexer/intent-detector`

**Example**:
```javascript
const { IntentDetector } = require('./terminator/modules/recon-indexer');
const detector = new IntentDetector();
const intent = detector.detectIntent(filePath, content);
```

---

## build-file-graph

**Описание**: Построение графа зависимостей файлов

**Input**:
```json
{
  "projectPath": "/path/to/project"
}
```

**Output**:
```json
{
  "nodes": ["/path/file1.js", "/path/file2.js"],
  "edges": [{ "from": "/path/file1.js", "to": "/path/file2.js" }],
  "metrics": {
    "/path/file1.js": { "inDegree": 0, "outDegree": 1 }
  }
}
```

**Module**: `terminator/modules/recon-indexer/graph-builder`

**Example**:
```javascript
const { FileGraphBuilder } = require('./terminator/modules/recon-indexer');
const builder = new FileGraphBuilder();
const graph = builder.buildGraph('/path/to/project');
```

---

## score-file-interest

**Описание**: Оценка "интересности" файла

**Input**:
```json
{
  "filePath": "/path/to/file.js",
  "graph": { "metrics": {} },
  "content": "file content"
}
```

**Output**: `{ "score": 25 }`

**Module**: `terminator/modules/recon-indexer/interest-scorer`

**Example**:
```javascript
const { InterestScorer } = require('./terminator/modules/recon-indexer');
const scorer = new InterestScorer();
const score = scorer.scoreFile(filePath, graph, content);
```

---

## Use Cases

### 1. Анализ заброшенного проекта
```javascript
// Найти самые интересные файлы
const results = await pipeline.scan('/abandoned-project', {
  maxFiles: 10,
  deepAnalysis: true
});

// Показать файлы с TODO/FIXME
const unfinished = results.candidates.filter(c => 
  c.intent?.intents.some(i => i.type === 'unfinished')
);
```

### 2. Поиск экспериментального кода
```javascript
const results = await pipeline.scan('/project', { deepAnalysis: true });
const experiments = results.candidates.filter(c =>
  c.intent?.intents.some(i => i.type === 'experiment')
);
```

### 3. Извлечение идей из комментариев
```javascript
const allIdeas = results.candidates
  .flatMap(c => c.intent?.ideas || [])
  .filter(idea => idea.includes('IDEA') || idea.includes('FUTURE'));
```

### 4. Batch анализ priority-3
```bash
# Сканировать все проекты в priority-3
node recon-batch.js

# Параллельно (быстрее)
node recon-parallel.js
```

---

## Integration with Other Agents

### data-collector
- Собирает результаты разведки
- Агрегирует статистику по проектам
- Находит общие паттерны

### system-manager
- Управляет кэшем
- Планирует повторные сканирования
- Мониторит изменения файлов

### task-executor
- Выполняет batch/parallel сканирование
- Генерирует отчёты
- Применяет фильтры к результатам
