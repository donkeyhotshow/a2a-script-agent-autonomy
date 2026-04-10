# RAG Пакет - Архитектура

## Обзор

RAG (Retrieval-Augmented Generation) пакет в `a2a-client/packages/rag/src/` предоставляет полнофункциональную систему для индексации и поиска кода в проектах. Пакет поддерживает несколько методов поиска: ключевые слова, TF-IDF/BM25, семантический поиск по эмбеддингам и гибридный поиск.

---

## Диаграмма компонентов

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAG ARCHITECTURE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐        ┌─────────────────────────────────────┐    │
│  │   INPUT/OUTPUT      │        │          CORE MODULES                │    │
│  │                     │        │                                      │    │
│  │  • Файлы проекта    │───────▶│  ┌─────────────┐   ┌─────────────┐  │    │
│  │  • Запросы          │        │  │  Indexer    │   │  Searcher   │  │    │
│  │  • Результаты       │◀───────│  │ (indexer.ts)│   │(searcher.ts)│  │    │
│  │                     │        │  └──────┬──────┘   └──────┬──────┘  │    │
│  └─────────────────────┘        │         │               │         │    │
│                                  │         ▼               ▼         │    │
│                                  │  ┌─────────────────────────────────┐│    │
│                                  │  │      ChunkManager               ││    │
│                                  │  │    (chunk-manager.ts)           ││    │
│                                  │  └─────────────────────────────────┘│    │
│                                  └─────────────────────────────────────┘    │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        CHUNKING LAYER                                 │   │
│  │                                                                       │   │
│  │  ┌──────────────────┐           ┌────────────────────────────────┐ │   │
│  │  │  ChunkManager    │           │       ASTChunker                │ │   │
│  │  │  (regex-based)   │──────────▶│   (ast-chunker.ts)              │ │   │
│  │  │                  │  fallback│   • acorn (JS)                  │ │   │
│  │  │  • PHP classes  │           │   • @typescript-eslint (TS)     │ │   │
│  │  │  • JS functions │           │   • php-parser (PHP)             │ │   │
│  │  │  • Vue sections │           └────────────────────────────────┘ │   │
│  │  │  • Markdown     │                                                │   │
│  │  └──────────────────┘                                                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        SEARCH LAYER                                   │   │
│  │                                                                       │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │   │
│  │  │   SPARSE        │  │     DENSE       │  │      HYBRID         │ │   │
│  │  │   (keyword)     │  │  (semantic)     │  │    (combined)       │ │   │
│  │  │                 │  │                 │  │                     │ │   │
│  │  │ • RAGSearcher   │  │ • Semantic      │  │ • HybridSearcher    │ │   │
│  │  │   .search()     │  │   Searcher      │  │ • RAGSearcher       │ │   │
│  │  │                 │  │   (extends      │  │   .searchHybrid()   │ │   │
│  │  │ • TFIDFService  │  │    RAGSearcher) │  │                     │ │   │
│  │  │ • BM25Scorer    │  │                 │  │   RRF Fusion:       │ │   │
│  │  │ • Meilisearch   │  │ • embeddings    │  │   1/(k + rank)     │ │   │
│  │  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘ │   │
│  │           │                      │                      │            │   │
│  └───────────┼──────────────────────┼──────────────────────┼────────────┘   │
│              │                      │                      │                  │
│              ▼                      ▼                      ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    ENHANCEMENT LAYER                                 │    │
│  │                                                                      │    │
│  │  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │    │
│  │  │    Reranker     │  │   Query         │  │    Suggestions   │  │    │
│  │  │  (reranker.ts)  │  │  Understanding  │  │  (suggestions.ts)│  │    │
│  │  │                 │  │ (query-underst.) │  │                  │  │    │
│  │  │ • Cohere       │  │                 │  │ • Prefix index   │  │    │
│  │  │ • Jina AI      │  │ • Intent detect │  │ • Symbol index   │  │    │
│  │  │ • Local fallback│  │ • Entity extract│  │ • Query expand   │  │    │
│  │  └──────────────────┘  └─────────────────┘  └──────────────────┘  │    │
│  │                                                                      │    │
│  │  ┌────────────────────────────────────────────────────────────────┐  │    │
│  │  │              Code Similarity (code-similarity.ts)            │  │    │
│  │  │  • Jaccard • Cosine • Overlap • Dice                         │  │    │
│  │  │  • Duplicate detection                                        │  │    │
│  │  └────────────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Классы и их назначение

### Core (Ядро системы)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`RAGIndexer`](src/indexer.ts:40) | `indexer.ts` | Индексация файлов проекта. Обходит директории, фильтрует по паттернам, создает чанки и сохраняет индекс в `.a2a/index/rag-files.json` |
| [`RAGSearcher`](src/searcher.ts:54) | `searcher.ts` | Поиск по индексированным файлам. Поддерживает keyword, TF-IDF и гибридный поиск |
| [`ChunkManager`](src/chunk-manager.ts:23) | `chunk-manager.ts` | Разбиение файлов на чанки. Для каждого языка - свой парсер (PHP, JS/TS, Vue, Markdown) |
| [`RAGIntegrator`](src/rag-integrator.ts:28) | `rag-integrator.ts` | Интегратор: соединяет FileScanner с RAGIndexer. Также поддерживает watch mode через chokidar |

### Chunking (Разбиение на чанки)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`ChunkManager`](src/chunk-manager.ts:23) | `chunk-manager.ts` | Базовое разбиение по регулярным выражениям. Различает: классы, методы, функции, интерфейсы, роуты Laravel |
| [`ASTChunker`](src/ast-chunker.ts:41) | `ast-chunker.ts" | Разбиение с использованием AST-парсеров. Использует acorn (JS), @typescript-eslint (TS), php-parser (PHP). Fallback на regex при ошибках |

### Sparse Search (Разреженный поиск - по ключевым словам)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`TFIDFService`](src/tfidf.ts:5) | `tfidf.ts` | TF-IDF с BM25 scoring. Токенизация, расчет IDF, поиск документов |
| [`BM25Scorer`](src/bm25.ts:17) | `bm25.ts` | Отдельная реализация Okapi BM25 с инвертированным индексом. Поддерживает сериализацию |
| [`MeilisearchClient`](src/meilisearch-client.ts:43) | `meilisearch-client.ts` | Клиент для Meilisearch - внешней поисковой системы (BM25). Настройка индекса, добавление документов, поиск |

### Dense Search (Плотный поиск - по эмбеддингам)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`SemanticSearcher`](src/semantic-search.ts:21) | `semantic-search.ts` | Семантический поиск по векторным представлениям. Наследует RAGSearcher, добавляет работу с embeddings. Использует `@a2a/embedding` клиент |

### Hybrid Search (Гибридный поиск)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`HybridSearcher`](src/hybrid-search.ts:64) | `hybrid-search.ts" | Объединяет sparse и dense поиск через RRF (Reciprocal Rank Fusion). Взвешивание результатов |

### Reranking (Переранжирование)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`RerankerClient`](src/reranker.ts:44) | `reranker.ts` | Переранжирование результатов через внешние API. Поддерживает Cohere и Jina AI. Local fallback - простой keyword scoring |

### Query Understanding (Понимание запросов)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`QueryUnderstandingEngine`](src/query-understanding.ts:39) | `query-understanding.ts` | Анализ запроса: определение intent, извлечение сущностей (frameworks, file types, symbols). 8 типов intent: exact_name, code_pattern, semantic, dependency, file_path, symbol, documentation, mixed |

### Suggestions (Поисковые подсказки)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`SearchSuggestionsEngine`](src/suggestions.ts:27) | `suggestions.ts` | Подсказки для автодополнения. Индексирует символы, prefix tree для быстрого поиска |
| [`QueryExpander`](src/suggestions.ts:152) | `suggestions.ts" | Расширение запросов. Учит связи между терминами из кликов пользователя |

### Code Analysis (Анализ кода)

| Класс | Файл | Назначение |
|-------|------|------------|
| [`CodeSimilarityEngine`](src/code-similarity.ts:22) | `code-similarity.ts" | Поиск похожего кода. Метрики: Jaccard, Cosine, Overlap, Dice. Обнаружение дубликатов |

---

## Зависимости между классами

```
index.ts (точка входа)
├── createRAG()
│   ├── RAGIndexer
│   │   └── ChunkManager
│   ├── RAGSearcher
│   │   └── TFIDFService
│   └── ChunkManager
│
├── Экспорты:
│   ├── RAGIntegrator
│   │   ├── FileScanner (@a2a/execution)
│   │   ├── RAGIndexer
│   │   └── ChunkManager
│   │
│   ├── SemanticSearcher (extends RAGSearcher)
│   │   ├── RAGSearcher
│   │   └── embeddingClient (@a2a/embedding)
│   │
│   ├── HybridSearcher
│   │   ├── (sparse) BM25Scorer / MeilisearchClient
│   │   └── (dense) SemanticSearcher
│   │
│   ├── RerankerClient (Cohere / Jina API)
│   ├── QueryUnderstandingEngine
│   ├── SearchSuggestionsEngine
│   ├── QueryExpander
│   ├── ASTChunker (acorn / @typescript-eslint / php-parser)
│   └── CodeSimilarityEngine
```

---

## Поток поиска (Search Flow)

### Простой поиск (Keyword)

```
Пользователь
     │
     ▼
RAGSearcher.search(query)
     │
     ├─▶ 1. loadIndex() - загрузить rag-files.json
     │
     ├─▶ 2. extractKeywords() - токенизация, удаление стоп-слов
     │       • words: обычные слова
     │       • techTerms: CamelCase, технические термины
     │       • methodNames: имена методов с ()
     │
     ├─▶ 3. Для каждого чанка:
     │       scoreChunk() - подсчет релевантности
     │       • совпадения слов (вес × 2)
     │       • techTerms (вес × 10)
     │       • methodNames (вес × 15)
     │       • бонус для class/method/function типов
     │       • штраф за общие слова (import, const, return...)
     │
     ├─▶ 4. findHighlights() - найти контекст вокруг совпадений
     │
     └─▶ 5. Сортировка по score, лимит результатов
```

### TF-IDF Поиск

```
Пользователь
     │
     ▼
RAGSearcher.searchTFIDF(query)
     │
     ├─▶ buildTFIDFIndex() - построить индекс (один раз)
     │       • токенизация всех чанков
     │       • расчет IDF для каждого термина
     │
     ├─▶ TFIDFService.search()
     │       • BM25 scoring: IDF × (tf × (k1+1)) / (tf + k1×(1-b+b×docLen/avgLen))
     │
     └─▶ Маппинг ID → Chunk, сортировка
```

### Семантический поиск

```
Пользователь
     │
     ▼
SemanticSearcher.searchSimilar(query)
     │
     ├─▶ buildVectorIndex() - построить векторный индекс (один раз)
     │       • Для каждого чанка: getEmbedding(content)
     │       • Кеширование эмбеддингов
     │
     ├─▶ getEmbedding(query) - вектор запроса
     │
     ├─▶ Для каждого чанка:
     │       similarity = dotProduct(queryEmbedding, chunkEmbedding)
     │
     └─▶ Сортировка по similarity
```

### Гибридный поиск

```
Пользователь
     │
     ▼
RAGSearcher.searchHybrid(query)
     или
SemanticSearcher.searchHybridSemantic(query)
     │
     ├─▶ Параллельно:
     │       • keyword search (RAGSearcher.search)
     │       • TF-IDF search (RAGSearcher.searchTFIDF)
     │       • semantic search (SemanticSearcher.searchSimilar)
     │
     ├─▶ RRF Fusion (Reciprocal Rank Fusion)
     │       Для каждого документа d:
     │       RRF(d) = Σ weight × (1 / (k + rank))
     │       где k = 60 (по умолчанию)
     │
     ├─▶ Применение весов (опционально)
     │
     └─▶ Финальная сортировка, лимит
```

---

## Поток индексации (Indexing Flow)

```
Проект
   │
   ▼
RAGIndexer.indexProject()
   │
   ├─▶ walkDirectory() - обход файлов
   │       • фильтрация по includePatterns
   │       • фильтрация по excludePatterns
   │       • использование IgnoreDetector
   │
   ├─▶ Для каждого файла: indexFile()
   │       • чтение файла
   │       • ChunkManager.chunkFile()
   │       • создание IndexFileInfo
   │
   └─▶ Сохранение в .a2a/index/rag-files.json
           {
             version, timestamp, projectPath,
             files: [path, ext, size, modified, hash, language],
             chunks: [id, filePath, type, name, content, startLine, endLine]
           }
```

### ChunkManager разбиение по языкам

```
.php  →  • class → method
         • route (Laravel Route::*)
         • binding (app(), App::make())

.js/.ts  →  • function
           • class
           • interface
           • type
           • exported-function/class

.vue  →  • <script> section
        • <template> section
        • <style> section
        • (внутри script: class/function)

.md  →  • # Section (по заголовкам)

другие  →  chunkLines() - по 50 строк
```

---

## Примеры использования

### Базовое использование (из [`index.ts`](src/index.ts:40))

```typescript
import { createRAG } from '@a2a/rag';

const rag = createRAG({ projectPath: '/my/project' });

// Индексация
await rag.indexer.indexProject();

// Поиск
const results = await rag.searcher.search('UserService');
console.log(results);

// Гибридный поиск
const hybridResults = await rag.searcher.searchHybrid('auth login', {
    keywordWeight: 0.3,
    tfidfWeight: 0.3,
    semanticWeight: 0.4
});
```

### Семантический поиск (из [`semantic-search.ts`](src/semantic-search.ts:67))

```typescript
import { SemanticSearcher } from '@a2a/rag';

const searcher = new SemanticSearcher({ projectPath: '/my/project' });
await searcher.loadIndex();

// Семантический поиск
const results = await searcher.searchSimilar(
    'function that validates user input',
    { limit: 10 }
);

// Гибридный семантический поиск
const hybridResults = await searcher.searchHybridSemantic(
    'authenticate user',
    { keywordWeight: 0.3, tfidfWeight: 0.3, semanticWeight: 0.4 }
);
```

### Интегратор с watch mode (из [`rag-integrator.ts`](src/rag-integrator.ts:28))

```typescript
import { RAGIntegrator } from '@a2a/rag';

const integrator = new RAGIntegrator({ projectPath: '/my/project' });

// Одноразовая индексация
await integrator.scanAndIndex();

// Или с отслеживанием изменений
integrator.startWatching();
// ... файлы автоматически переиндексируются при изменении
integrator.stopWatching();
```

### Reranking (из [`reranker.ts`](src/reranker.ts:68))

```typescript
import { RerankerClient } from '@a2a/rag';

const reranker = new RerankerClient({
    provider: 'cohere',
    apiKey: process.env.RERANKER_API_KEY
});

const results = await reranker.rerank(
    'how to authenticate users',
    [
        { id: '1', content: 'Login method implementation...' },
        { id: '2', content: 'User validation function...' },
    ],
    { topN: 10 }
);
```

### Query Understanding (из [`query-understanding.ts`](src/query-understanding.ts:58))

```typescript
import { QueryUnderstandingEngine, INTENT_TYPES } from '@a2a/rag';

const engine = new QueryUnderstandingEngine();

const intent = engine.analyze('UserService controller');
// intent.type = 'exact_name'
// intent.confidence = 0.95
// intent.entities.frameworks = []
// intent.entities.symbols = ['UserService']

const intent2 = engine.analyze('how to add authentication');
// intent2.type = 'documentation'
// intent2.confidence = 0.8
```

---

## Конфигурация

### Основные опции RAG

```typescript
interface RAGConfig {
    projectPath?: string;          // Путь к проекту
    includePatterns?: string[];   // Файлы для индексации (glob)
    excludePatterns?: string[];   // Файлы исключения
    useTFIDF?: boolean;            // Использовать TF-IDF
    useBM25?: boolean;             // Использовать BM25
    useSemantic?: boolean;         // Использовать семантический поиск
    maxDepth?: number;             // Макс. глубина обхода
    maxFiles?: number;             // Макс. кол-во файлов
    embeddingModel?: string;       // Модель эмбеддингов
    embeddingProvider?: string;    // Провайдер эмбеддингов
}
```

### Опции гибридного поиска

```typescript
interface HybridSearchOptions {
    limit?: number;                // Кол-во результатов
    keywordWeight?: number;        // Вес keyword (0-1)
    tfidfWeight?: number;          // Вес TF-IDF (0-1)
    k?: number;                    // RRF k parameter (default: 60)
}
```

---

## Кто когда участвует

| Компонент | Индексация | Поиск | Когда НЕ участвует |
|-----------|------------|-------|---------------------|
| **RAGIndexer** | ✅ Да | ❌ | Без индексации |
| **ChunkManager** | ✅ Да | ❌ | Без разбиения |
| **RAGSearcher** | ❌ | ✅ Да | Всегда в поиске |
| **TFIDFService** | ❌ | ✅ Да (опционально) | Если useTFIDF=false |
| **BM25Scorer** | ❌ | ✅ Да (опционально) | Если не используется |
| **SemanticSearcher** | ❌ | ✅ Да (опционально) | Если useSemantic=false |
| **HybridSearcher** | ❌ | ✅ Да (опционально) | Если не гибридный |
| **RerankerClient** | ❌ | ✅ Да (опционально) | Без переранжирования |
| **QueryUnderstanding** | ❌ | ✅ Да (опционально) | Без анализа запросов |
| **Suggestions** | ❌ | ✅ Да (опционально) | Без подсказок |
| **RAGIntegrator** | ✅ Да | ❌ | Без интегратора |
| **ASTChunker** | ✅ Да (fallback) | ❌ | Если базовый chunking работает |

---

## Сводка

- **Core**: `RAGIndexer` + `RAGSearcher` + `ChunkManager` - основа системы
- **Chunking**: Базовый (regex) и продвинутый (AST) - для разных языков
- **Search**: 3 типа - keyword, TF-IDF/BM25, semantic - можно комбинировать
- **Enhancement**: Reranking, Query Understanding, Suggestions - улучшение результатов
- **External**: Meilisearch (внешний BM25), Cohere/Jina (reranking), embedding провайдеры
