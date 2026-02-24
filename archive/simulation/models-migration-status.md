# Статус миграции ML моделей в a2a-client

## Обзор

Документ отражает текущее состояние миграции ML моделей из документации в реализацию.

---

## 1. Какие модели сейчас используются

### Документированные модели (a2a-client/models/)

| Тип модели | Приоритет | Назначение | Статус документации |
|------------|-----------|------------|---------------------|
| **Sparse Retrieval** | ⭐⭐⭐ ВЫСОКИЙ | Fulltext-подобный поиск (BM25, TF-IDF) | Полная |
| **Hybrid Retrieval** | ⭐⭐⭐ ВЫСОКИЙ | Комбинация sparse + dense методов | Полная |
| **Embedding Models** | ⭐⭐ СРЕДНИЙ | Векторное представление (CodeBERT, GraphCodeBERT) | Полная |
| **Cross-Encoder** | ⭐⭐ СРЕДНИЙ | Точное ранжирование результатов | Полная |

### Ключевые выводы из опыта

| Подход | Результат | Рекомендация |
|--------|-----------|--------------|
| **Fulltext Search** | ✅ Лучший результат | Использовать как основу |
| **Hybrid (Fulltext + Embeddings)** | ✅ Хорошо | Для улучшения точности |
| **BM25 с ранжированием** | ✅ Хорошо | Быстрый и надежный |
| **RAG индексы через скрипты** | ❌ Не удалось реализовать | Использовать готовые решения |
| **Graph индексы через скрипты** | ❌ Не удалось реализовать | Использовать готовые решения |

### Рекомендуемые конфигурации

1. **Минимальная** — Meilisearch/Typesense (CPU only, ~100MB RAM)
2. **Стандартная** — Meilisearch + pgvector + RRF Fusion (CPU, ~500MB RAM)
3. **Продвинутая** — + Cross-Encoder Reranking + Intent Detection (CPU + GPU/API, ~1GB RAM)

---

## 2. Что предлагает Plexe

### Клиент Plexe (a2a-server/src/ml/plexe.client.ts)

Plexe — это ML платформа для embeddings и моделей. Клиент определяет следующий API:

| Метод | Назначение | Входные данные | Выходные данные |
|-------|------------|----------------|-----------------|
| [`initPlexeClient()`](a2a-server/src/ml/plexe.client.ts:41) | Инициализация клиента | `PlexeConfig` | `void` |
| [`getEmbedding()`](a2a-server/src/ml/plexe.client.ts:53) | Получить embedding для текста | `text, model?` | `number[]` |
| [`getEmbeddings()`](a2a-server/src/ml/plexe.client.ts:65) | Batch embeddings | `texts[], model?` | `number[][]` |
| [`classifyText()`](a2a-server/src/ml/plexe.client.ts:80) | Классификация текста | `text, model, labels?` | `ClassificationResponse` |
| [`classifyIntent()`](a2a-server/src/ml/plexe.client.ts:96) | Классификация intent | `text` | `{intent, confidence}` |
| [`detectActions()`](a2a-server/src/ml/plexe.client.ts:109) | Детекция действий | `text` | `[{action, target?, confidence}]` |
| [`classifyDocument()`](a2a-server/src/ml/plexe.client.ts:123) | Классификация документа | `content, filename` | `{type, framework?, confidence}` |
| [`checkPlexeHealth()`](a2a-server/src/ml/plexe.client.ts:139) | Health check | — | `{status, latency?, error?}` |
| [`getAvailableModels()`](a2a-server/src/ml/plexe.client.ts:152) | Список моделей | — | `string[]` |

### Интерфейсы данных

```typescript
interface PlexeConfig {
  apiKey: string;
  baseUrl: string;
  timeout?: number;
}

interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
}

interface ClassificationResponse {
  label: string;
  confidence: number;
  scores: Record<string, number>;
}
```

---

## 3. Что нужно мигрировать

### Сопоставление документации и Plexe API

| Документация (models/) | Plexe API | Миграция |
|------------------------|-----------|----------|
| Embedding Models (CodeBERT) | `getEmbedding()`, `getEmbeddings()` | ✅ Прямое соответствие |
| Cross-Encoder Reranking | — | ⚠️ Не реализовано в Plexe client |
| Intent Detection | `classifyIntent()` | ✅ Прямое соответствие |
| Action Detection | `detectActions()` | ✅ Прямое соответствие |
| Document Classification | `classifyDocument()` | ✅ Прямое соответствие |
| Sparse Retrieval (BM25) | — | ❌ Внешний сервис (Meilisearch) |
| Hybrid Fusion (RRF) | — | ❌ Требует отдельной реализации |

### Требуемые доработки

1. **Plexe Client** — реализовать все методы (сейчас заглушки)
2. **Sparse Index** — интеграция с Meilisearch/Typesense
3. **Hybrid Fusion** — реализовать RRF алгоритм
4. **Cross-Encoder** — добавить reranking после hybrid search

---

## 4. Статус миграции

### Plexe Client

| Метод | Статус | Описание |
|-------|--------|----------|
| `initPlexeClient()` | ❌ Не реализовано | `throw Error('not implemented')` |
| `getEmbedding()` | ❌ Не реализовано | `throw Error('not implemented')` |
| `getEmbeddings()` | ❌ Не реализовано | `throw Error('not implemented')` |
| `classifyText()` | ❌ Не реализовано | `throw Error('not implemented')` |
| `classifyIntent()` | ❌ Не реализовано | `throw Error('not implemented')` |
| `detectActions()` | ❌ Не реализовано | `throw Error('not implemented')` |
| `classifyDocument()` | ❌ Не реализовано | `throw Error('not implemented')` |
| `checkPlexeHealth()` | ❌ Не реализовано | `throw Error('not implemented')` |
| `getAvailableModels()` | ❌ Не реализовано | `throw Error('not implemented')` |

### Другие ML сервисы

| Компонент | Файл | Статус |
|-----------|------|--------|
| Embedding Service | [`embedding.service.ts`](a2a-server/src/ml/embedding.service.ts) | ⚠️ Требует проверки |
| Indexer Service | [`indexer.service.ts`](a2a-server/src/ml/indexer.service.ts) | ⚠️ Требует проверки |
| Search Service | [`search.service.ts`](a2a-server/src/ml/search.service.ts) | ⚠️ Требует проверки |

### Чек-лист внедрения (из recommendations.md)

#### Фаза 1: Основа (1-2 дня)
- [ ] Установить Meilisearch/Typesense
- [ ] Настроить индексацию файлов проекта
- [ ] Реализовать базовый поиск
- [ ] Интегрировать с context block

#### Фаза 2: Гибридный поиск (2-3 дня)
- [ ] Добавить embeddings через Plexe
- [ ] Реализовать RRF fusion
- [ ] Оптимизировать веса для кода

#### Фаза 3: Продвинутые функции (3-5 дней)
- [ ] Добавить reranking
- [ ] Реализовать intent detection
- [ ] Настроить адаптивное взвешивание

---

## 5. Выводы

### Текущее состояние

1. **Документация** — полная и детальная, покрывает все аспекты ML моделей
2. **Plexe Client** — только интерфейсы, все методы — заглушки
3. **Интеграция** — отсутствует, требуется полная реализация

### Приоритеты миграции

1. **Высокий** — реализовать Plexe Client (embeddings, intent detection)
2. **Высокий** — интегрировать Meilisearch для sparse retrieval
3. **Средний** — реализовать hybrid fusion (RRF)
4. **Средний** — добавить cross-encoder reranking

### Рекомендации

1. Начать с реализации `getEmbedding()` и `getEmbeddings()` — основа для dense search
2. Использовать готовые решения (Meilisearch, pgvector) вместо написания скриптов
3. Следовать чек-листу из `recommendations.md` по фазам

---

## Текущий статус (обновлено 2026-02-23)

### Реализовано на клиенте

| Компонент | Файл | Статус |
|-----------|------|--------|
| TF-IDF/BM25 | `a2a-client/packages/rag/src/tfidf.js` | ✅ Готово |
| Интеграция в searcher | `a2a-client/packages/rag/src/searcher.js` | ✅ Готово |
| RRF гибридный поиск | `searcher.js:searchHybrid()` | ✅ Готово |
| Документация | `a2a-client/packages/rag/README.md` | ✅ Обновлено |

### Остаётся реализовать

| Компонент | Описание | Сложность |
|-----------|----------|-----------|
| classify() | Классификация текста | Средняя |
| detectIntent() | Определение намерений | Средняя |

### Что было сделано

1. **TF-IDF Service** — полноценный BM25 алгоритм для sparse retrieval
2. **Интеграция в RAGSearcher** — методы `searchTFIDF()`, `searchHybrid()`, `buildTFIDFIndex()`
3. **RRF алгоритм** — Reciprocal Rank Fusion для объединения результатов
4. **Документация** — обновлён README с примерами использования

### Ключевые файлы

- [`a2a-client/packages/rag/src/tfidf.js`](a2a-client/packages/rag/src/tfidf.js) — TF-IDF/BM25 сервис
- [`a2a-client/packages/rag/src/searcher.js`](a2a-client/packages/rag/src/searcher.js) — поиск с интеграцией TF-IDF
- [`a2a-client/packages/rag/README.md`](a2a-client/packages/rag/README.md) — документация
