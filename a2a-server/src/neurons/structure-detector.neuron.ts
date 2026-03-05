/**
 * Structure Detector Neuron
 *
 * Detects document structures and patterns in data and adds structure metadata labels.
 * Used for structure detection and organization analysis.
 */

import type {Neuron} from '../types/knowledge.types.js';

export interface StructureMetadata {
    structure: string;
    confidence: number;
    elements: string[];
    hierarchy: Record<string, number>;
    patterns: Record<string, number>;
}

export interface StructureDetectionResult {
    [key: string]: StructureMetadata;
}

export const structureDetectorNeuron: Neuron = {
    id: 'neuron-structure-detector',
    name: 'Structure Detector',
    category: 'custom_lint',
    triggers: ['*'], // Reacts to any structured data
    knowledge: {
        description: 'Detects document structures and organizational patterns',
        structurePatterns: {
            'markdown_document': {
                indicators: ['# ', '## ', '### ', '- ', '1. ', '```', '---', '---'],
                regex: /^(#{1,6}\s|-\s|\d+\.\s|```|---)/gm,
                weight: 0.9,
                elements: ['headings', 'lists', 'code_blocks', 'separators']
            },
            'json_structure': {
                indicators: ['{', '}', '"', ':', ',', '[', ']'],
                regex: /(\{|\}|"|:|,|\[|\])/g,
                weight: 0.8,
                elements: ['objects', 'arrays', 'strings', 'numbers']
            },
            'yaml_structure': {
                indicators: ['-', ':', '  ', '---', '...'],
                regex: /^(-|\w+:|\s{2,}\w+:|---|\.\.\.)/gm,
                weight: 0.8,
                elements: ['mappings', 'sequences', 'scalars', 'documents']
            },
            'code_file': {
                indicators: ['function', 'class', 'import', 'export', 'const', 'let', 'var'],
                regex: /\b(function|class|import|export|const|let|var)\b/gi,
                weight: 0.9,
                elements: ['functions', 'classes', 'imports', 'variables']
            },
            'configuration': {
                indicators: ['=', ';', '#', '//', '/*', '*/', '[', ']'],
                regex: /(\s*=\s*|;\s*$|#\s|\/\/\s|\/\*|\*\/|\[\s*\w+\s*\])/gm,
                weight: 0.7,
                elements: ['key_value_pairs', 'comments', 'sections']
            },
            'table_data': {
                indicators: ['|', '-', '+', '---', '||'],
                regex: /(\|\s*|\+\s*-+\s*\+|\|\s*-+\s*\||---)/gm,
                weight: 0.8,
                elements: ['headers', 'rows', 'columns', 'separators']
            }
        },
        minConfidence: 0.4,
        minElements: 3
    },
    actions: [
        {type: 'analyze', target: 'structure-detection'},
        {type: 'inject', target: 'metadata'}
    ],
    triggersMode: 'any',
    priority: 5
};

/**
 * Analyze data for structure patterns
 */
export function detectStructures(data: unknown): StructureDetectionResult {
    const result: StructureDetectionResult = {};

    if (typeof data === 'string') {
        return detectStructuresFromString(data);
    } else if (typeof data === 'object' && data !== null) {
        return detectStructuresFromObject(data as Record<string, unknown>);
    }

    return result;
}

/**
 * Analyze string data for structure patterns
 */
function detectStructuresFromString(text: string): StructureDetectionResult {
    const result: StructureDetectionResult = {};
    const textLower = text.toLowerCase();

    const structurePatterns = structureDetectorNeuron.knowledge.structurePatterns as Record<string, any>;

    for (const [structureName, structureConfig] of Object.entries(structurePatterns)) {
        const indicators = structureConfig.indicators;
        const regex = structureConfig.regex;
        const weight = structureConfig.weight;
        const elements = structureConfig.elements;

        // Count indicator matches
        const matches = text.match(regex);
        const indicatorCount = matches ? matches.length : 0;

        // Calculate density
        const totalChars = text.length;
        const density = totalChars > 0 ? indicatorCount / (totalChars / 100) : 0;

        // Calculate confidence based on density and weight
        const confidence = Math.min(1.0, density * weight * 5);

        if (confidence >= (structureDetectorNeuron.knowledge.minConfidence as number)) {
            // Find specific indicators found
            const foundElements = elements.filter(element =>
                textLower.includes(element.toLowerCase())
            );

            // Count patterns
            const patterns: Record<string, number> = {};
            indicators.forEach(indicator => {
                const count = (text.match(new RegExp(indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
                if (count > 0) {
                    patterns[indicator] = count;
                }
            });

            // Analyze hierarchy for markdown
            let hierarchy: Record<string, number> = {};
            if (structureName === 'markdown_document') {
                hierarchy = analyzeMarkdownHierarchy(text);
            }

            if (foundElements.length >= (structureDetectorNeuron.knowledge.minElements as number)) {
                result[`structure_${structureName}`] = {
                    structure: structureName,
                    confidence: Math.round(confidence * 100) / 100,
                    elements: foundElements,
                    hierarchy: hierarchy,
                    patterns: patterns
                };
            }
        }
    }

    return result;
}

/**
 * Analyze object structure patterns
 */
function detectStructuresFromObject(obj: Record<string, unknown>): StructureDetectionResult {
    const result: StructureDetectionResult = {};
    const jsonString = JSON.stringify(obj, null, 2);

    return detectStructuresFromString(jsonString);
}

/**
 * Analyze markdown hierarchy
 */
function analyzeMarkdownHierarchy(text: string): Record<string, number> {
    const hierarchy: Record<string, number> = {
        h1: 0,
        h2: 0,
        h3: 0,
        h4: 0,
        h5: 0,
        h6: 0,
        lists: 0,
        code_blocks: 0,
        tables: 0
    };

    const lines = text.split('\n');

    for (const line of lines) {
        const trimmed = line.trim();

        // Count headings
        const headingMatch = trimmed.match(/^(#{1,6})\s/);
        if (headingMatch) {
            const level = headingMatch[1].length;
            hierarchy[`h${level}` as keyof typeof hierarchy]++;
        }

        // Count lists
        if (trimmed.match(/^(\s*[-*+]\s|^\s*\d+\.\s)/)) {
            hierarchy.lists++;
        }

        // Count code blocks
        if (trimmed.startsWith('```') || trimmed.startsWith('    ')) {
            hierarchy.code_blocks++;
        }

        // Count table elements
        if (trimmed.includes('|') && (trimmed.includes('-') || trimmed.includes('+'))) {
            hierarchy.tables++;
        }
    }

    return hierarchy;
}

/**
 * Add structure metadata to data
 */
export function addStructureMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const result = {...data};
    const textFields = getTextFields(data);

    for (const [fieldPath, text] of Object.entries(textFields)) {
        const structures = detectStructuresFromString(text);
        if (Object.keys(structures).length > 0) {
            result[`_structure_metadata_${fieldPath.replace(/\./g, '_')}`] = structures;
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

        if (typeof value === 'string' && value.length > 20) {
            textFields[fieldPath] = value;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nestedFields = getTextFields(value as Record<string, unknown>, fieldPath);
            Object.assign(textFields, nestedFields);
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'string' && item.length > 20) {
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