/**
 * Query Understanding - Intent detection and query analysis
 * 
 * Analyzes user search queries to understand intent and optimize search.
 * 
 * @module @a2a/rag/query-understanding
 * @version 1.0.0
 */

/**
 * Query intent types
 */
const INTENT_TYPES = {
  EXACT_NAME: 'exact_name',       // "UserService", "createUser()"
  CODE_PATTERN: 'code_pattern',   // "->createUser(", "$user->"
  SEMANTIC: 'semantic',           // "how to create user", "user validation"
  DEPENDENCY: 'dependency',        // "who uses UserService"
  FILE_PATH: 'file_path',         // "app/Models/User"
  SYMBOL: 'symbol',               // "class User", "function login"
  DOCUMENTATION: 'documentation', // "laravel docs", "api reference"
  MIXED: 'mixed',                 // Mixed intent
};

/**
 * Query Understanding Engine
 */
class QueryUnderstandingEngine {
  constructor(config = {}) {
    this.config = config;
    
    // Intent patterns
    this.patterns = {
      exact_name: [
        /^[A-Z][a-zA-Z0-9]+(?:Service|Controller|Model|Provider|Middleware)$/,
        /^[A-Z][a-zA-Z0-9]+$/,
      ],
      code_pattern: [
        /->[a-zA-Z_]/,
        /\$\w+->/,
        /::[a-zA-Z_]/,
        /\([a-zA-Z_]+\)/,
        /function\s+\w+/,
        /class\s+\w+/,
      ],
      dependency: [
        /^who\s+(uses|imports|calls)/i,
        /^where\s+(is|used|called)/i,
        /^\w+\s+dependencies/i,
      ],
      file_path: [
        /^(app|src|lib|models|services|controllers|views)/i,
        /\.(php|js|ts|vue|py|rb|go|rs)$/,
        /\/[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/,
      ],
      symbol: [
        /^class\s+/i,
        /^function\s+/i,
        /^interface\s+/i,
        /^trait\s+/i,
        /^enum\s+/i,
      ],
      documentation: [
        /^how\s+/i,
        /^what\s+/i,
        /^why\s+/i,
        /^docs?\s+/i,
        /^guide\s+/i,
      ],
    };
  }

  /**
   * Analyze query and detect intent
   * @param {string} query - Search query
   * @returns {Object} Intent analysis result
   */
  analyze(query) {
    if (!query || typeof query !== 'string') {
      return { type: INTENT_TYPES.SEMANTIC, confidence: 0, terms: [], suggestions: [] };
    }

    const trimmed = query.trim();
    const lowerQuery = trimmed.toLowerCase();
    const terms = this._tokenize(trimmed);
    
    // Detect intents
    const intents = this._detectIntents(trimmed, lowerQuery, terms);
    
    // Determine primary intent
    const primary = this._selectPrimaryIntent(intents);
    
    // Generate suggestions
    const suggestions = this._generateSuggestions(trimmed, primary);
    
    // Extract entities
    const entities = this._extractEntities(trimmed, terms);
    
    return {
      type: primary.type,
      confidence: primary.confidence,
      terms,
      entities,
      suggestions,
      modifiers: this._extractModifiers(lowerQuery),
      originalQuery: trimmed,
    };
  }

  /**
   * Tokenize query
   * @param {string} query - Query string
   * @returns {string[]} Tokens
   * @private
   */
  _tokenize(query) {
    return query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0);
  }

  /**
   * Detect multiple intents
   * @param {string} query - Original query
   * @param {string} lowerQuery - Lowercase query
   * @param {string[]} terms - Tokenized terms
   * @returns {Array} Detected intents
   * @private
   */
  _detectIntents(query, lowerQuery, terms) {
    const intents = [];

    // Check exact name
    for (const pattern of this.patterns.exact_name) {
      if (pattern.test(query)) {
        intents.push({ type: INTENT_TYPES.EXACT_NAME, confidence: 0.95 });
        break;
      }
    }

    // Check code patterns
    for (const pattern of this.patterns.code_pattern) {
      if (pattern.test(query)) {
        intents.push({ type: INTENT_TYPES.CODE_PATTERN, confidence: 0.9 });
        break;
      }
    }

    // Check dependency queries
    for (const pattern of this.patterns.dependency) {
      if (pattern.test(query)) {
        intents.push({ type: INTENT_TYPES.DEPENDENCY, confidence: 0.85 });
        break;
      }
    }

    // Check file path
    for (const pattern of this.patterns.file_path) {
      if (pattern.test(query)) {
        intents.push({ type: INTENT_TYPES.FILE_PATH, confidence: 0.9 });
        break;
      }
    }

    // Check symbol queries
    for (const pattern of this.patterns.symbol) {
      if (pattern.test(query)) {
        intents.push({ type: INTENT_TYPES.SYMBOL, confidence: 0.85 });
        break;
      }
    }

    // Check documentation queries
    for (const pattern of this.patterns.documentation) {
      if (pattern.test(query)) {
        intents.push({ type: INTENT_TYPES.DOCUMENTATION, confidence: 0.8 });
        break;
      }
    }

    // If no specific intent, default to semantic
    if (intents.length === 0) {
      intents.push({ type: INTENT_TYPES.SEMANTIC, confidence: 0.7 });
    }

    return intents;
  }

  /**
   * Select primary intent
   * @param {Array} intents - Detected intents
   * @returns {Object} Primary intent
   * @private
   */
  _selectPrimaryIntent(intents) {
    if (intents.length === 0) {
      return { type: INTENT_TYPES.SEMANTIC, confidence: 0.5 };
    }

    // Sort by confidence
    const sorted = [...intents].sort((a, b) => b.confidence - a.confidence);
    
    // If multiple intents, mark as mixed
    if (sorted.length > 1 && sorted[0].confidence - sorted[1].confidence < 0.2) {
      return { type: INTENT_TYPES.MIXED, confidence: 0.7, alternatives: sorted.slice(0, 3) };
    }

    return sorted[0];
  }

  /**
   * Generate search suggestions
   * @param {string} query - Original query
   * @param {Object} intent - Detected intent
   * @returns {Array} Suggestions
   * @private
   */
  _generateSuggestions(query, intent) {
    const suggestions = [];
    const lowerQuery = query.toLowerCase();

    // Add exact match variant
    if (!query.includes(' ')) {
      suggestions.push(query);
      suggestions.push(query + 'Service');
      suggestions.push(query + 'Controller');
    }

    // Add code patterns based on intent
    if (intent.type === INTENT_TYPES.EXACT_NAME) {
      suggestions.push(query + '()');
      suggestions.push('$' + query.charAt(0).toLowerCase() + query.slice(1));
      suggestions.push(query + '->');
    }

    // Add related terms
    const related = this._findRelatedTerms(lowerQuery);
    suggestions.push(...related);

    return suggestions.slice(0, 5);
  }

  /**
   * Find related terms
   * @param {string} query - Query
   * @returns {Array} Related terms
   * @private
   */
  _findRelatedTerms(query) {
    const relatedTerms = {
      'user': ['UserService', 'UserController', 'UserModel', 'UserRepository'],
      'auth': ['Authentication', 'Login', 'Register', 'AuthController'],
      'api': ['ApiController', 'ApiResource', 'ApiResponse'],
      'model': ['Model', 'Repository', 'Eloquent'],
      'service': ['Service', 'Provider', 'Interface'],
    };

    const related = [];
    for (const [key, values] of Object.entries(relatedTerms)) {
      if (query.includes(key)) {
        related.push(...values);
      }
    }

    return related;
  }

  /**
   * Extract entities from query
   * @param {string} query - Query
   * @param {string[]} terms - Tokenized terms
   * @returns {Object} Extracted entities
   * @private
   */
  _extractEntities(query, terms) {
    const entities = {
      frameworks: [],
      fileTypes: [],
      symbols: [],
      namespaces: [],
    };

    // Detect frameworks
    const frameworks = ['laravel', 'vue', 'react', 'symfony', 'django', 'rails'];
    for (const fw of frameworks) {
      if (query.toLowerCase().includes(fw)) {
        entities.frameworks.push(fw);
      }
    }

    // Detect file types
    const fileTypes = ['php', 'js', 'ts', 'vue', 'py', 'rb', 'go', 'rs'];
    for (const ext of fileTypes) {
      if (query.includes('.' + ext) || query.includes(ext + ' ')) {
        entities.fileTypes.push(ext);
      }
    }

    // Detect symbols
    const symbols = terms.filter(t => 
      t.length > 3 && /^[A-Z]/.test(t.charAt(0).toUpperCase())
    );
    entities.symbols = symbols;

    return entities;
  }

  /**
   * Extract query modifiers
   * @param {string} query - Lowercase query
   * @returns {Object} Modifiers
   * @private
   */
  _extractModifiers(query) {
    const modifiers = {
      isNegation: false,
      isFuzzy: false,
      isExact: false,
      isWildcard: false,
    };

    if (query.startsWith('not ') || query.startsWith('without ')) {
      modifiers.isNegation = true;
    }

    if (query.includes('~') || query.includes('approx ')) {
      modifiers.isFuzzy = true;
    }

    if (query.startsWith('"') && query.endsWith('"')) {
      modifiers.isExact = true;
    }

    if (query.includes('*') || query.includes('?')) {
      modifiers.isWildcard = true;
    }

    return modifiers;
  }
}

/**
 * Create query understanding engine
 * @param {Object} config - Configuration
 * @returns {QueryUnderstandingEngine}
 */
function createQueryUnderstandingEngine(config) {
  return new QueryUnderstandingEngine(config);
}

module.exports = {
  QueryUnderstandingEngine,
  createQueryUnderstandingEngine,
  INTENT_TYPES,
};
