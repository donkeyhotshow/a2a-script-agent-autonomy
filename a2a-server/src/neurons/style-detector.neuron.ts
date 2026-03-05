/**
 * Style Detector Neuron
 *
 * Detects writing styles and patterns in text data and adds style metadata labels.
 * Used for style detection and consistency analysis.
 */

import type {Neuron} from '../types/knowledge.types.js';

export interface StyleMetadata {
    style: string;
    confidence: number;
    indicators: string[];
    patterns: Record<string, number>;
}

export interface StyleDetectionResult {
    [key: string]: StyleMetadata;
}

export const styleDetectorNeuron: Neuron = {
    id: 'neuron-style-detector',
    name: 'Style Detector',
    category: 'custom_lint',
    triggers: ['*'], // Reacts to any text data
    knowledge: {
        description: 'Detects writing styles and patterns in text data',
        stylePatterns: {
            'formal': {
                indicators: ['shall', 'must', 'should', 'therefore', 'furthermore', 'however'],
                regex: /\b(shall|must|should|therefore|furthermore|however)\b/gi,
                weight: 0.8
            },
            'casual': {
                indicators: ['just', 'really', 'actually', 'basically', 'kind of', 'sort of'],
                regex: /\b(just|really|actually|basically|kind of|sort of)\b/gi,
                weight: 0.7
            },
            'technical': {
                indicators: ['implementation', 'architecture', 'framework', 'component', 'module', 'interface'],
                regex: /\b(implementation|architecture|framework|component|module|interface)\b/gi,
                weight: 0.9
            },
            'marketing': {
                indicators: ['innovative', 'cutting-edge', 'revolutionary', 'solution', 'empower', 'leverage'],
                regex: /\b(innovative|cutting-edge|revolutionary|solution|empower|leverage)\b/gi,
                weight: 0.8
            },
            'academic': {
                indicators: ['according to', 'research shows', 'studies indicate', 'hypothesis', 'methodology', 'conclusion'],
                regex: /\b(according to|research shows|studies indicate|hypothesis|methodology|conclusion)\b/gi,
                weight: 0.9
            }
        },
        minConfidence: 0.3,
        maxIndicators: 5
    },
    actions: [
        {type: 'analyze', target: 'style-detection'},
        {type: 'inject', target: 'metadata'}
    ],
    triggersMode: 'any',
    priority: 5
};

/**
 * Analyze text for style patterns
 */
export function detectStyles(text: string): StyleDetectionResult {
    if (!text || typeof text !== 'string') {
        return {};
    }

    const result: StyleDetectionResult = {};
    const textLower = text.toLowerCase();
    const words = textLower.split(/\s+/);
    const totalWords = words.length;

    const stylePatterns = styleDetectorNeuron.knowledge.stylePatterns as Record<string, any>;

    for (const [styleName, styleConfig] of Object.entries(stylePatterns)) {
        const indicators = styleConfig.indicators;
        const regex = styleConfig.regex;
        const weight = styleConfig.weight;

        // Count indicator matches
        const matches = textLower.match(regex);
        const indicatorCount = matches ? matches.length : 0;

        // Calculate density
        const density = totalWords > 0 ? indicatorCount / totalWords : 0;

        // Calculate confidence based on density and weight
        const confidence = Math.min(1.0, density * weight * 10);

        if (confidence >= (styleDetectorNeuron.knowledge.minConfidence as number)) {
            // Find specific indicators found
            const foundIndicators = indicators.filter(indicator =>
                textLower.includes(indicator.toLowerCase())
            ).slice(0, styleDetectorNeuron.knowledge.maxIndicators as number);

            // Count patterns
            const patterns: Record<string, number> = {};
            indicators.forEach(indicator => {
                const count = (textLower.match(new RegExp(`\\b${indicator}\\b`, 'gi')) || []).length;
                if (count > 0) {
                    patterns[indicator] = count;
                }
            });

            result[`style_${styleName}`] = {
                style: styleName,
                confidence: Math.round(confidence * 100) / 100,
                indicators: foundIndicators,
                patterns: patterns
            };
        }
    }

    return result;
}

/**
 * Add style metadata to data
 */
export function addStyleMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const result = {...data};
    const textFields = getTextFields(data);

    for (const [fieldPath, text] of Object.entries(textFields)) {
        const styles = detectStyles(text);
        if (Object.keys(styles).length > 0) {
            result[`_style_metadata_${fieldPath.replace(/\./g, '_')}`] = styles;
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

        if (typeof value === 'string' && value.length > 10) {
            textFields[fieldPath] = value;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nestedFields = getTextFields(value as Record<string, unknown>, fieldPath);
            Object.assign(textFields, nestedFields);
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'string' && item.length > 10) {
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