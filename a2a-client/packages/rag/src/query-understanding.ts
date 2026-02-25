/**
 * Query Understanding - Intent detection and query analysis
 */

export const INTENT_TYPES = {
  EXACT_NAME: 'exact_name',
  CODE_PATTERN: 'code_pattern',
  SEMANTIC: 'semantic',
  DEPENDENCY: 'dependency',
  FILE_PATH: 'file_path',
  SYMBOL: 'symbol',
  DOCUMENTATION: 'documentation',
  MIXED: 'mixed',
} as const;

export interface QueryUnderstandingConfig {
  [key: string]: unknown;
}

export interface IntentResult {
  type: string;
  confidence: number;
  terms: string[];
  entities: { frameworks: string[]; fileTypes: string[]; symbols: string[]; namespaces: string[] };
  suggestions: string[];
  modifiers: { isNegation: boolean; isFuzzy: boolean; isExact: boolean; isWildcard: boolean };
  originalQuery: string;
}

interface IntentPatterns {
  exact_name: RegExp[];
  code_pattern: RegExp[];
  dependency: RegExp[];
  file_path: RegExp[];
  symbol: RegExp[];
  documentation: RegExp[];
}

export class QueryUnderstandingEngine {
  private config: QueryUnderstandingConfig;
  private patterns: IntentPatterns;

  constructor(config: QueryUnderstandingConfig = {}) {
    this.config = config;
    this.patterns = {
      exact_name: [
        /^[A-Z][a-zA-Z0-9]+(?:Service|Controller|Model|Provider|Middleware)$/,
        /^[A-Z][a-zA-Z0-9]+$/,
      ],
      code_pattern: [/->[a-zA-Z_]/, /\$\w+->/, /::[a-zA-Z_]/, /\([a-zA-Z_]+\)/, /function\s+\w+/, /class\s+\w+/],
      dependency: [/^who\s+(uses|imports|calls)/i, /^where\s+(is|used|called)/i, /^\w+\s+dependencies/i],
      file_path: [/^(app|src|lib|models|services|controllers|views)/i, /\.(php|js|ts|vue|py|rb|go|rs)$/, /\/[a-zA-Z0-9_]+\/[a-zA-Z0-9_]+/],
      symbol: [/^class\s+/i, /^function\s+/i, /^interface\s+/i, /^trait\s+/i, /^enum\s+/i],
      documentation: [/^how\s+/i, /^what\s+/i, /^why\s+/i, /^docs?\s+/i, /^guide\s+/i],
    };
  }

  analyze(query: string): IntentResult {
    if (!query || typeof query !== 'string') {
      return {
        type: INTENT_TYPES.SEMANTIC,
        confidence: 0,
        terms: [],
        entities: { frameworks: [], fileTypes: [], symbols: [], namespaces: [] },
        suggestions: [],
        modifiers: { isNegation: false, isFuzzy: false, isExact: false, isWildcard: false },
        originalQuery: '',
      };
    }
    const trimmed = query.trim();
    const lowerQuery = trimmed.toLowerCase();
    const terms = this._tokenize(trimmed);
    const intents = this._detectIntents(trimmed, lowerQuery, terms);
    const primary = this._selectPrimaryIntent(intents);
    const suggestions = this._generateSuggestions(trimmed, primary);
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

  private _tokenize(query: string): string[] {
    return query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 0);
  }

  private _detectIntents(_query: string, query: string, _terms: string[]): Array<{ type: string; confidence: number }> {
    const intents: Array<{ type: string; confidence: number }> = [];
    if (this.patterns.exact_name.some((p) => p.test(query))) intents.push({ type: INTENT_TYPES.EXACT_NAME, confidence: 0.95 });
    if (this.patterns.code_pattern.some((p) => p.test(query))) intents.push({ type: INTENT_TYPES.CODE_PATTERN, confidence: 0.9 });
    if (this.patterns.dependency.some((p) => p.test(query))) intents.push({ type: INTENT_TYPES.DEPENDENCY, confidence: 0.85 });
    if (this.patterns.file_path.some((p) => p.test(query))) intents.push({ type: INTENT_TYPES.FILE_PATH, confidence: 0.9 });
    if (this.patterns.symbol.some((p) => p.test(query))) intents.push({ type: INTENT_TYPES.SYMBOL, confidence: 0.85 });
    if (this.patterns.documentation.some((p) => p.test(query))) intents.push({ type: INTENT_TYPES.DOCUMENTATION, confidence: 0.8 });
    if (intents.length === 0) intents.push({ type: INTENT_TYPES.SEMANTIC, confidence: 0.7 });
    return intents;
  }

  private _selectPrimaryIntent(intents: Array<{ type: string; confidence: number }>): { type: string; confidence: number } {
    if (intents.length === 0) return { type: INTENT_TYPES.SEMANTIC, confidence: 0.5 };
    const sorted = [...intents].sort((a, b) => b.confidence - a.confidence);
    if (sorted.length > 1 && sorted[0].confidence - sorted[1].confidence < 0.2) return { type: INTENT_TYPES.MIXED, confidence: 0.7 };
    return sorted[0];
  }

  private _generateSuggestions(query: string, intent: { type: string }): string[] {
    const suggestions: string[] = [];
    if (!query.includes(' ')) suggestions.push(query, query + 'Service', query + 'Controller');
    if (intent.type === INTENT_TYPES.EXACT_NAME) suggestions.push(query + '()', query.charAt(0).toLowerCase() + query.slice(1), query + '->');
    const related: Record<string, string[]> = {
      user: ['UserService', 'UserController', 'UserModel', 'UserRepository'],
      auth: ['Authentication', 'Login', 'Register', 'AuthController'],
      api: ['ApiController', 'ApiResource', 'ApiResponse'],
      model: ['Model', 'Repository', 'Eloquent'],
      service: ['Service', 'Provider', 'Interface'],
    };
    for (const [key, values] of Object.entries(related)) {
      if (query.toLowerCase().includes(key)) suggestions.push(...values);
    }
    return suggestions.slice(0, 5);
  }

  private _extractEntities(query: string, terms: string[]): IntentResult['entities'] {
    const entities: IntentResult['entities'] = { frameworks: [], fileTypes: [], symbols: [], namespaces: [] };
    ['laravel', 'vue', 'react', 'symfony', 'django', 'rails'].forEach((fw) => {
      if (query.toLowerCase().includes(fw)) entities.frameworks.push(fw);
    });
    ['php', 'js', 'ts', 'vue', 'py', 'rb', 'go', 'rs'].forEach((ext) => {
      if (query.includes('.' + ext) || query.includes(ext + ' ')) entities.fileTypes.push(ext);
    });
    entities.symbols = terms.filter((t) => t.length > 3 && /^[A-Z]/.test(t.charAt(0).toUpperCase()));
    return entities;
  }

  private _extractModifiers(query: string): IntentResult['modifiers'] {
    return {
      isNegation: query.startsWith('not ') || query.startsWith('without '),
      isFuzzy: query.includes('~') || query.includes('approx '),
      isExact: query.startsWith('"') && query.endsWith('"'),
      isWildcard: query.includes('*') || query.includes('?'),
    };
  }
}

export function createQueryUnderstandingEngine(config?: QueryUnderstandingConfig): QueryUnderstandingEngine {
  return new QueryUnderstandingEngine(config);
}
