"use strict";
/**
 * Query Understanding - Intent detection and query analysis
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryUnderstandingEngine = exports.INTENT_TYPES = void 0;
exports.createQueryUnderstandingEngine = createQueryUnderstandingEngine;
exports.INTENT_TYPES = {
    EXACT_NAME: 'exact_name',
    CODE_PATTERN: 'code_pattern',
    SEMANTIC: 'semantic',
    DEPENDENCY: 'dependency',
    FILE_PATH: 'file_path',
    SYMBOL: 'symbol',
    DOCUMENTATION: 'documentation',
    MIXED: 'mixed',
};
class QueryUnderstandingEngine {
    constructor(config = {}) {
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
    analyze(query) {
        if (!query || typeof query !== 'string') {
            return {
                type: exports.INTENT_TYPES.SEMANTIC,
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
    _tokenize(query) {
        return query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((t) => t.length > 0);
    }
    _detectIntents(_query, query, _terms) {
        const intents = [];
        if (this.patterns.exact_name.some((p) => p.test(query)))
            intents.push({
                type: exports.INTENT_TYPES.EXACT_NAME,
                confidence: 0.95
            });
        if (this.patterns.code_pattern.some((p) => p.test(query)))
            intents.push({
                type: exports.INTENT_TYPES.CODE_PATTERN,
                confidence: 0.9
            });
        if (this.patterns.dependency.some((p) => p.test(query)))
            intents.push({
                type: exports.INTENT_TYPES.DEPENDENCY,
                confidence: 0.85
            });
        if (this.patterns.file_path.some((p) => p.test(query)))
            intents.push({
                type: exports.INTENT_TYPES.FILE_PATH,
                confidence: 0.9
            });
        if (this.patterns.symbol.some((p) => p.test(query)))
            intents.push({
                type: exports.INTENT_TYPES.SYMBOL,
                confidence: 0.85
            });
        if (this.patterns.documentation.some((p) => p.test(query)))
            intents.push({
                type: exports.INTENT_TYPES.DOCUMENTATION,
                confidence: 0.8
            });
        if (intents.length === 0)
            intents.push({ type: exports.INTENT_TYPES.SEMANTIC, confidence: 0.7 });
        return intents;
    }
    _selectPrimaryIntent(intents) {
        if (intents.length === 0)
            return { type: exports.INTENT_TYPES.SEMANTIC, confidence: 0.5 };
        const sorted = [...intents].sort((a, b) => b.confidence - a.confidence);
        if (sorted.length > 1 && sorted[0].confidence - sorted[1].confidence < 0.2)
            return {
                type: exports.INTENT_TYPES.MIXED,
                confidence: 0.7
            };
        return sorted[0];
    }
    _generateSuggestions(query, intent) {
        const suggestions = [];
        if (!query.includes(' '))
            suggestions.push(query, query + 'Service', query + 'Controller');
        if (intent.type === exports.INTENT_TYPES.EXACT_NAME)
            suggestions.push(query + '()', query.charAt(0).toLowerCase() + query.slice(1), query + '->');
        const related = {
            user: ['UserService', 'UserController', 'UserModel', 'UserRepository'],
            auth: ['Authentication', 'Login', 'Register', 'AuthController'],
            api: ['ApiController', 'ApiResource', 'ApiResponse'],
            model: ['Model', 'Repository', 'Eloquent'],
            service: ['Service', 'Provider', 'Interface'],
        };
        for (const [key, values] of Object.entries(related)) {
            if (query.toLowerCase().includes(key))
                suggestions.push(...values);
        }
        return suggestions.slice(0, 5);
    }
    _extractEntities(query, terms) {
        const entities = { frameworks: [], fileTypes: [], symbols: [], namespaces: [] };
        const q = query.toLowerCase();
        // Detect frameworks
        ['laravel', 'vue', 'react', 'symfony', 'django', 'rails'].forEach((fw) => {
            if (q.includes(fw))
                entities.frameworks.push(fw);
        });
        // Smart file type detection based on query context
        const fileTypePatterns = {
            // Frontend/UI
            'component': ['vue', 'ts', 'js'],
            'ui': ['vue', 'ts', 'css', 'scss'],
            'style': ['css', 'scss', 'less', 'vue'],
            'template': ['vue', 'html', 'blade.php'],
            'frontend': ['vue', 'ts', 'js', 'css'],
            // Backend/API
            'api': ['php', 'ts', 'js'],
            'controller': ['php', 'ts', 'js'],
            'model': ['php', 'ts', 'js'],
            'service': ['php', 'ts', 'js'],
            'middleware': ['php', 'ts', 'js'],
            'route': ['php', 'ts', 'js', 'json'],
            'endpoint': ['php', 'ts', 'js', 'json'],
            // Documentation
            'docs': ['md', 'mdx'],
            'documentation': ['md', 'mdx'],
            'readme': ['md'],
            'guide': ['md'],
            // Tests
            'test': ['ts', 'js', 'php'],
            'spec': ['ts', 'js'],
            'testing': ['ts', 'js', 'php'],
            // Config
            'config': ['json', 'yaml', 'yml', 'ts', 'js'],
            'configuration': ['json', 'yaml', 'yml', 'ts', 'js'],
            // Database
            'migration': ['php', 'ts', 'sql'],
            'migrations': ['php', 'ts', 'sql'],
            'schema': ['prisma', 'sql', 'php'],
            'database': ['php', 'sql', 'prisma'],
            'db': ['php', 'sql', 'prisma'],
            // Scripts
            'script': ['js', 'ts', 'sh', 'ps1'],
            'build': ['json', 'js', 'ts'],
            'deploy': ['sh', 'yml', 'yaml'],
            // Code patterns
            'function': ['php', 'ts', 'js', 'py'],
            'class': ['php', 'ts', 'js', 'py'],
            'interface': ['ts', 'php'],
            'type': ['ts', 'php'],
            'enum': ['ts', 'php'],
            'trait': ['php'],
            // Docker/DevOps
            'docker': ['dockerfile', 'yml', 'yaml'],
            'ci': ['yml', 'yaml'],
        };
        for (const [keyword, types] of Object.entries(fileTypePatterns)) {
            if (q.includes(keyword)) {
                for (const type of types) {
                    if (!entities.fileTypes.includes(type)) {
                        entities.fileTypes.push(type);
                    }
                }
            }
        }
        // Also check for explicit extensions in query
        ['php', 'js', 'ts', 'vue', 'py', 'rb', 'go', 'rs', 'md', 'json', 'yml', 'yaml', 'sql'].forEach((ext) => {
            if (q.includes('.' + ext) || q.includes(ext + ' file') || q.includes(ext + ' files')) {
                if (!entities.fileTypes.includes(ext)) {
                    entities.fileTypes.push(ext);
                }
            }
        });
        entities.symbols = terms.filter((t) => t.length > 3 && /^[A-Z]/.test(t.charAt(0).toUpperCase()));
        return entities;
    }
    _extractModifiers(query) {
        return {
            isNegation: query.startsWith('not ') || query.startsWith('without '),
            isFuzzy: query.includes('~') || query.includes('approx '),
            isExact: query.startsWith('"') && query.endsWith('"'),
            isWildcard: query.includes('*') || query.includes('?'),
        };
    }
}
exports.QueryUnderstandingEngine = QueryUnderstandingEngine;
function createQueryUnderstandingEngine(config) {
    return new QueryUnderstandingEngine(config);
}
