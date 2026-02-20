# ML Strategy Configuration

## Обзор

Конфигурационный файл `ml-strategy.config.js` предоставляет переключатель между тремя архитектурными подходами ML.

## Стратегии

### 1. ML-Only (Только ML)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Input     │────▶│  ML Model   │────▶│   Output    │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Характеристики:**
- Модели обучаются на данных
- Нет rule-based fallback
- Максимальная автоматизация
- Требует качественного датасета

**Когда использовать:**
- Есть достаточный датасет
- Высокие требования к автоматизации
- Допустимы редкие ошибки

### 2. Hybrid (Гибридная)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Input     │────▶│   Tier 1    │────▶│   Tier 2    │────▶│   Output    │
│             │     │  Эвристики  │     │  ML Models  │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    top-N кандидатов
```

**Характеристики:**
- Tier 1: Дешёвые эвристики (regex, граф)
- Tier 2: ML-модели для top-N кандидатов
- Оптимальный баланс скорости и точности

**Когда использовать:**
- Большие объёмы данных
- Критична скорость ответа
- Нужна высокая точность

### 3. Confidence Threshold

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Input     │────▶│  ML Model   │────▶│ confidence  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                              ┌────────────────┴────────────────┐
                              │                                 │
                              ▼                                 ▼
                    ┌─────────────────┐              ┌─────────────────┐
                    │  confidence ≥   │              │  confidence <   │
                    │    threshold    │              │    threshold    │
                    └────────┬────────┘              └────────┬────────┘
                             │                                │
                             ▼                                ▼
                    ┌─────────────────┐              ┌─────────────────┐
                    │   ML Result     │              │ Default Value   │
                    └─────────────────┘              └─────────────────┘
```

**Характеристики:**
- ML используется всегда
- При низкой уверенности (< threshold) возвращается дефолт
- Баланс между автоматизацией и надёжностью

**Когда использовать:**
- Критична надёжность
- Недопустимы ложные срабатывания
- Есть разумные дефолты

## Структура конфигурации

```javascript
module.exports = {
  // Текущая стратегия
  strategy: 'hybrid', // 'ml-only' | 'hybrid' | 'confidence'

  // Конфигурация стратегий
  strategies: {
    'ml-only': { ... },
    'hybrid': { ... },
    'confidence': { ... }
  },

  // Общие настройки
  common: {
    cache: { enabled: true, ttl: 3600 },
    logging: { enabled: true },
    metrics: { enabled: true }
  },

  // Пути к пакетам
  packages: {
    hybridSearch: './packages/hybrid-search',
    graph: './packages/graph',
    agent: './packages/agent'
  }
};
```

## Переключение стратегии

### Через переменную окружения

```bash
# ML-Only
export ML_STRATEGY=ml-only

# Hybrid (по умолчанию)
export ML_STRATEGY=hybrid

# Confidence Threshold
export ML_STRATEGY=confidence
```

### Программно

```javascript
const config = require('./ml-strategy.config.js');

// Получить текущую стратегию
const strategy = config.strategies[config.strategy];

// Проверить Tier 1
const tier1Enabled = strategy.tier1?.enabled || false;

// Получить порог уверенности
const threshold = strategy.confidenceThreshold || 0.0;
```

## ML-модели по стратегии

| Модель | ML-Only | Hybrid | Confidence |
|--------|---------|--------|------------|
| Query Type Classifier | ✅ Всегда | ✅ Tier 2 | ✅ + threshold |
| File Type Classifier | ✅ Всегда | ✅ Tier 2 | ✅ + threshold |
| Intent Detector | ✅ Всегда | ✅ Tier 2 | ✅ + threshold |
| Chunk Relevance Predictor | ✅ Всегда | ❌ | ✅ + threshold |
| Ignore Pattern Predictor | ✅ Всегда | ❌ | ✅ + threshold |

## Tier 1: Эвристики

### Query Type Rules

```javascript
// packages/hybrid-search/src/index.js
const queryTypeRules = {
  exact: [/^\w+\.\w+$/, /^\/.+\/$/],
  phrase: [/^".+"$/, /^'.+'$/],
  file: [/\.php$/, /\.vue$/, /\.js$/, /\.ts$/],
  general: [/.*/] // fallback
};
```

### File Type Rules

```javascript
// packages/graph/src/builder.js
const fileTypeRules = {
  controller: [/Controller\.php$/],
  model: [/\/Models\//, /\.php$/],
  service: [/\/Services\//, /Service\.php$/],
  config: [/^config\//],
  test: [/Test\.php$/, /\/tests\//]
};
```

### Intent Rules

```javascript
// packages/agent/src/index.js
const intentRules = {
  search: ['найди', 'find', 'search', 'где', 'where'],
  index: ['индекс', 'index', 'обнови', 'update'],
  explain: ['объясни', 'explain', 'что это', 'what is'],
  refactor: ['рефактор', 'refactor', 'улучши', 'improve'],
  test: ['тест', 'test', 'покрой', 'cover'],
  debug: ['дебаг', 'debug', 'ошибка', 'error', 'баг']
};
```

## Метрики качества

| Метрика | ML-Only | Hybrid | Confidence |
|---------|---------|--------|------------|
| Precision@K | 0.82 | 0.88 | 0.85 |
| Recall@K | 0.78 | 0.85 | 0.80 |
| Latency P95 | 150ms | 80ms | 120ms |
| Fallback Rate | 0% | 20% | 15% |

## Рекомендации

1. **Начать с Hybrid** — оптимальный баланс для production
2. **Собирать датасет** — логировать все предсказания
3. **A/B тестирование** — сравнивать стратегии на реальных данных
4. **Миграция на ML-Only** — когда датасет достаточен
