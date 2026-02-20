/**
 * ML Strategy Configuration
 * 
 * Переключатель между тремя архитектурными подходами:
 * 1. ml-only      - Только ML модели (Plexe)
 * 2. hybrid       - Tier 1 эвристики + Tier 2 ML
 * 3. confidence   - ML с confidence threshold fallback
 */

module.exports = {
  /**
   * Текущая стратегия ML
   * @type {'ml-only' | 'hybrid' | 'confidence'}
   */
  strategy: process.env.ML_STRATEGY || 'hybrid',

  /**
   * Конфигурация для каждой стратегии
   */
  strategies: {
    /**
     * Стратегия 1: Только ML (Plexe)
     * - Модели обучаются на данных
     * - Нет rule-based fallback
     * - Максимальная автоматизация
     */
    'ml-only': {
      enabled: true,
      fallbackEnabled: false,
      confidenceThreshold: 0.0, // Всегда используем ML
      models: {
        queryTypeClassifier: {
          enabled: true,
          model: 'bert-base-uncased',
          fallbackToRules: false
        },
        fileTypeClassifier: {
          enabled: true,
          model: 'random-forest',
          fallbackToRules: false
        },
        intentDetector: {
          enabled: true,
          model: 'bert-base-uncased',
          fallbackToRules: false
        },
        chunkRelevancePredictor: {
          enabled: true,
          model: 'xgboost',
          fallbackToRules: false
        },
        ignorePatternPredictor: {
          enabled: true,
          model: 'binary-classifier',
          fallbackToRules: false
        }
      }
    },

    /**
     * Стратегия 2: Гибридная (Tier 1 + Tier 2)
     * - Tier 1: Дешёвые эвристики (regex, граф)
     * - Tier 2: ML-модели для top-N кандидатов
     * - Оптимальный баланс скорости и точности
     */
    'hybrid': {
      enabled: true,
      fallbackEnabled: true,
      tier1: {
        // Tier 1: Эвристики (packages/hybrid-search, packages/graph)
        enabled: true,
        maxCandidates: 100, // Передаём top-100 в Tier 2
        rules: {
          queryType: {
            // Быстрые regex правила
            exactPatterns: ['^\\w+\\.\\w+$', '^\\/.+\\/$'],
            phrasePatterns: ['^".+"$', "^'.+'$"],
            filePatterns: ['\\.php$', '\\.vue$', '\\.js$', '\\.ts$']
          },
          fileType: {
            // Расширения файлов
            controller: ['Controller.php'],
            model: ['/Models/', '.php'],
            service: ['/Services/', 'Service.php'],
            config: ['config/', '.php'],
            test: ['Test.php', 'test/', 'tests/']
          },
          intent: {
            // Ключевые слова
            search: ['найди', 'find', 'search', 'где', 'where'],
            index: ['индекс', 'index', 'обнови', 'update'],
            explain: ['объясни', 'explain', 'что это', 'what is'],
            refactor: ['рефактор', 'refactor', 'улучши', 'improve'],
            test: ['тест', 'test', 'покрой', 'cover'],
            debug: ['дебаг', 'debug', 'ошибка', 'error', 'баг']
          }
        }
      },
      tier2: {
        // Tier 2: ML модели (только для кандидатов от Tier 1)
        enabled: true,
        models: {
          queryTypeClassifier: {
            enabled: true,
            model: 'bert-base-uncased'
          },
          fileTypeClassifier: {
            enabled: true,
            model: 'random-forest'
          },
          intentDetector: {
            enabled: true,
            model: 'bert-base-uncased'
          }
        }
      }
    },

    /**
     * Стратегия 3: ML с Confidence Threshold
     * - ML используется всегда
     * - При низкой уверенности (< threshold) возвращается дефолт
     * - Баланс между автоматизацией и надёжностью
     */
    'confidence': {
      enabled: true,
      fallbackEnabled: true,
      confidenceThreshold: 0.7, // Порог уверенности
      defaultValues: {
        // Дефолтные значения при низкой уверенности
        queryType: 'general',
        fileType: 'unknown',
        intent: 'search',
        relevance: 0.5,
        shouldIgnore: false
      },
      models: {
        queryTypeClassifier: {
          enabled: true,
          model: 'bert-base-uncased',
          minConfidence: 0.7
        },
        fileTypeClassifier: {
          enabled: true,
          model: 'random-forest',
          minConfidence: 0.8
        },
        intentDetector: {
          enabled: true,
          model: 'bert-base-uncased',
          minConfidence: 0.75
        },
        chunkRelevancePredictor: {
          enabled: true,
          model: 'xgboost',
          minConfidence: 0.6
        },
        ignorePatternPredictor: {
          enabled: true,
          model: 'binary-classifier',
          minConfidence: 0.8
        }
      }
    }
  },

  /**
   * Общие настройки для всех стратегий
   */
  common: {
    // Кэширование предсказаний
    cache: {
      enabled: true,
      ttl: 3600, // 1 час
      maxSize: 10000
    },
    // Логирование для сбора датасета
    logging: {
      enabled: true,
      logPredictions: true,
      logConfidence: true,
      outputPath: './logs/ml-predictions.jsonl'
    },
    // Метрики качества
    metrics: {
      enabled: true,
      trackAccuracy: true,
      trackLatency: true
    }
  },

  /**
   * Пути к пакетам с Tier 1 кодом
   */
  packages: {
    hybridSearch: './packages/hybrid-search',
    graph: './packages/graph',
    agent: './packages/agent'
  }
};

/**
 * Получить текущую конфигурацию стратегии
 */
function getCurrentStrategy() {
  const config = module.exports;
  const strategyName = config.strategy;
  return {
    name: strategyName,
    config: config.strategies[strategyName],
    common: config.common
  };
}

/**
 * Проверить, включён ли Tier 1
 */
function isTier1Enabled() {
  const config = module.exports;
  const strategy = config.strategies[config.strategy];
  return strategy.tier1?.enabled || false;
}

/**
 * Проверить, включён ли Tier 2 (ML)
 */
function isTier2Enabled() {
  const config = module.exports;
  const strategy = config.strategies[config.strategy];
  return strategy.tier2?.enabled || strategy.models ? true : false;
}

/**
 * Получить порог уверенности
 */
function getConfidenceThreshold() {
  const config = module.exports;
  const strategy = config.strategies[config.strategy];
  return strategy.confidenceThreshold || 0.0;
}

/**
 * Получить модель по имени
 */
function getModelConfig(modelName) {
  const config = module.exports;
  const strategy = config.strategies[config.strategy];
  
  // Для hybrid проверяем tier2
  if (config.strategy === 'hybrid') {
    return strategy.tier2?.models?.[modelName];
  }
  
  // Для ml-only и confidence
  return strategy.models?.[modelName];
}

/**
 * Экспорт вспомогательных функций
 */
module.exports.getCurrentStrategy = getCurrentStrategy;
module.exports.isTier1Enabled = isTier1Enabled;
module.exports.isTier2Enabled = isTier2Enabled;
module.exports.getConfidenceThreshold = getConfidenceThreshold;
module.exports.getModelConfig = getModelConfig;
