/**
 * Pattern Detector Neuron
 *
 * Detects specific patterns and coding conventions in data and adds pattern metadata labels.
 * Used for pattern detection and code quality analysis.
 */

import type {Neuron} from '../types/knowledge.types.js';

export interface PatternMetadata {
    pattern: string;
    confidence: number;
    matches: string[];
    count: number;
    locations: Array<{ line: number; column: number; match: string }>;
}

export interface PatternDetectionResult {
    [key: string]: PatternMetadata;
}

export const patternDetectorNeuron: Neuron = {
    id: 'neuron-pattern-detector',
    name: 'Pattern Detector',
    category: 'custom_lint',
    triggers: ['*'], // Reacts to any code or text data
    knowledge: {
        description: 'Detects specific patterns and coding conventions',
        codePatterns: {
            'naming_conventions': {
                patterns: {
                    'camelCase': {
                        regex: /\b[a-z][a-zA-Z0-9]*\b/g,
                        description: 'Camel case variables and functions'
                    },
                    'PascalCase': {
                        regex: /\b[A-Z][a-zA-Z0-9]*\b/g,
                        description: 'Pascal case classes and constructors'
                    },
                    'snake_case': {
                        regex: /\b[a-z][a-z0-9_]*\b/g,
                        description: 'Snake case variables and functions'
                    },
                    'UPPER_SNAKE_CASE': {
                        regex: /\b[A-Z][A-Z0-9_]*\b/g,
                        description: 'Upper snake case constants'
                    }
                }
            },
            'code_smells': {
                patterns: {
                    'long_lines': {
                        regex: /^.{120,}$/gm,
                        description: 'Lines longer than 120 characters'
                    },
                    'deep_nesting': {
                        regex: /^\s{24,}/gm,
                        description: 'Deep nesting (more than 12 levels)'
                    },
                    'magic_numbers': {
                        regex: /\b(?!0|1|2)\d{2,}\b/g,
                        description: 'Magic numbers (excluding 0, 1, 2)'
                    },
                    'console_logs': {
                        regex: /\bconsole\.(log|warn|error|debug)\b/gi,
                        description: 'Console statements'
                    }
                }
            },
            'security_patterns': {
                patterns: {
                    'hardcoded_secrets': {
                        regex: /\b(password|secret|key|token|api_key)\s*=\s*['"][^'"]{8,}['"]/gi,
                        description: 'Hardcoded secrets and credentials'
                    },
                    'sql_injection': {
                        regex: /\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b.*\+.*\b(request|params|query)\b/gi,
                        description: 'Potential SQL injection patterns'
                    },
                    'xss_vulnerabilities': {
                        regex: /\.innerHTML\s*=.*\b(request|params|query)\b/gi,
                        description: 'Potential XSS vulnerabilities'
                    }
                }
            },
            'framework_patterns': {
                patterns: {
                    'react_hooks': {
                        regex: /\buse[A-Z][a-zA-Z0-9]*\b/g,
                        description: 'React hooks usage'
                    },
                    'vue_composables': {
                        regex: /\buse[A-Z][a-zA-Z0-9]*\b/g,
                        description: 'Vue composables usage'
                    },
                    'angular_services': {
                        regex: /\b@Injectable\b/g,
                        description: 'Angular service decorators'
                    }
                }
            }
        },
        minConfidence: 0.2,
        minMatches: 2
    },
    actions: [
        {type: 'analyze', target: 'pattern-detection'},
        {type: 'inject', target: 'metadata'}
    ],
    triggersMode: 'any',
    priority: 4
};

/**
 * Analyze data for pattern patterns
 */
export function detectPatterns(data: unknown): PatternDetectionResult {
    const result: PatternDetectionResult = {};

    if (typeof data === 'string') {
        return detectPatternsFromString(data);
    } else if (typeof data === 'object' && data !== null) {
        return detectPatternsFromObject(data as Record<string, unknown>);
    }

    return result;
}

/**
 * Analyze string data for pattern patterns
 */
function detectPatternsFromString(text: string): PatternDetectionResult {
    const result: PatternDetectionResult = {};
    const lines = text.split('\n');

    const codePatterns = patternDetectorNeuron.knowledge.codePatterns as Record<string, any>;

    for (const [categoryName, categoryConfig] of Object.entries(codePatterns)) {
        for (const [patternName, patternConfig] of Object.entries(categoryConfig.patterns)) {
            const regex = patternConfig.regex;
            const description = patternConfig.description;

            // Find all matches
            const matches: string[] = [];
            const locations: Array<{ line: number; column: number; match: string }> = [];
            let match;

            // Reset regex lastIndex to avoid issues with global flag
            regex.lastIndex = 0;

            while ((match = regex.exec(text)) !== null) {
                matches.push(match[0]);

                // Calculate line and column
                const beforeMatch = text.substring(0, match.index);
                const line = (beforeMatch.match(/\n/g) || []).length + 1;
                const lastLineBreak = beforeMatch.lastIndexOf('\n');
                const column = match.index - (lastLineBreak === -1 ? 0 : lastLineBreak + 1);

                locations.push({
                    line: line,
                    column: column,
                    match: match[0]
                });
            }

            if (matches.length >= (patternDetectorNeuron.knowledge.minMatches as number)) {
                // Calculate confidence based on match density
                const totalChars = text.length;
                const matchChars = matches.join('').length;
                const density = totalChars > 0 ? matchChars / totalChars : 0;
                const confidence = Math.min(1.0, density * 5);

                if (confidence >= (patternDetectorNeuron.knowledge.minConfidence as number)) {
                    result[`pattern_${categoryName}_${patternName}`] = {
                        pattern: `${categoryName}_${patternName}`,
                        confidence: Math.round(confidence * 100) / 100,
                        matches: [...new Set(matches)], // Remove duplicates
                        count: matches.length,
                        locations: locations.slice(0, 10) // Limit to first 10 locations
                    };
                }
            }
        }
    }

    return result;
}

/**
 * Analyze object structure patterns
 */
function detectPatternsFromObject(obj: Record<string, unknown>): PatternDetectionResult {
    const result: PatternDetectionResult = {};
    const jsonString = JSON.stringify(obj, null, 2);

    return detectPatternsFromString(jsonString);
}

/**
 * Add pattern metadata to data
 */
export function addPatternMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const result = {...data};
    const textFields = getTextFields(data);

    for (const [fieldPath, text] of Object.entries(textFields)) {
        const patterns = detectPatternsFromString(text);
        if (Object.keys(patterns).length > 0) {
            result[`_pattern_metadata_${fieldPath.replace(/\./g, '_')}`] = patterns;
        }
    }

    return result;
}

/**
 * Extract text fields from nested data structure
 */
function getTextFields(data: Record<string, unknown>, prefix = ''): Record<string, string> {
    const textFields: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string' && value.length > 50) {
            textFields[fieldPath] = value;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nestedFields = getTextFields(value as Record<string, unknown>, fieldPath);
            Object.assign(textFields, nestedFields);
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'string' && item.length > 50) {
                    textFields[`${fieldPath}[${index}]`] = item;
                } else if (typeof item === 'object' && item !== null) {
                    const nestedFields = getTextFields(item as Record<string, unknown>, `${fieldPath}[${index}]`);
                    Object.assign(textFields, nestedFields);
                }
            });
        }
    }

    return textFields;
}

/**
 * Get pattern suggestions for code improvement
 */
export function getPatternSuggestions(data: unknown): Array<{
    type: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
    locations?: Array<{ line: number; column: number }>;
}> {
    const suggestions: Array<{
        type: string;
        message: string;
        severity: 'info' | 'warning' | 'error';
        locations?: Array<{ line: number; column: number }>;
    }> = [];

    if (typeof data !== 'string') {
        return suggestions;
    }

    const patterns = detectPatternsFromString(data);

    for (const [patternKey, patternData] of Object.entries(patterns)) {
        if (patternKey.includes('security')) {
            suggestions.push({
                type: 'security',
                message: `Potential security issue detected: ${patternData.pattern}`,
                severity: 'error',
                locations: patternData.locations.map(loc => ({ line: loc.line, column: loc.column }))
            });
        } else if (patternKey.includes('code_smells')) {
            suggestions.push({
                type: 'code_smell',
                message: `Code smell detected: ${patternData.pattern}`,
                severity: 'warning'
            });
        } else if (patternKey.includes('naming_conventions')) {
            suggestions.push({
                type: 'naming',
                message: `Naming convention detected: ${patternData.pattern}`,
                severity: 'info'
            });
        }
    }

    return suggestions;
}