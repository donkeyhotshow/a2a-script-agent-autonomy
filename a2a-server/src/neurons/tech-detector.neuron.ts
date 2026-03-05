/**
 * Technology Detector Neuron
 *
 * Detects specific technology mentions in data and adds technology metadata labels.
 * Used for technology stack detection and project analysis.
 */

import type {Neuron} from '../types/knowledge.types.js';

export interface TechMetadata {
    technology: string;
    confidence: number;
    indicators: string[];
    context: string[];
}

export interface TechDetectionResult {
    [key: string]: TechMetadata;
}

export const techDetectorNeuron: Neuron = {
    id: 'neuron-tech-detector',
    name: 'Technology Detector',
    category: 'custom_lint',
    triggers: ['*'], // Reacts to any data containing technology mentions
    knowledge: {
        description: 'Detects specific technology mentions and frameworks',
        techPatterns: {
            'laravel': {
                indicators: ['laravel', 'artisan', 'eloquent', 'blade', 'migration', 'seeder', 'controller', 'model', 'route'],
                regex: /\b(laravel|artisan|eloquent|blade|migration|seeder|controller|model|route)\b/gi,
                weight: 0.9,
                aliases: ['Laravel', 'LARAVEL']
            },
            'inertia': {
                indicators: ['inertia', 'inertia.js', 'inertia-vue', 'inertia-react', 'inertia-laravel'],
                regex: /\b(inertia|inertia\.js|inertia-vue|inertia-react|inertia-laravel)\b/gi,
                weight: 0.8,
                aliases: ['Inertia', 'INERTIA']
            },
            'vue': {
                indicators: ['vue', 'vue.js', 'vuejs', 'v-if', 'v-for', 'v-model', 'vue-router', 'vuex', 'pinia'],
                regex: /\b(vue|vue\.js|vuejs|v-if|v-for|v-model|vue-router|vuex|pinia)\b/gi,
                weight: 0.9,
                aliases: ['Vue', 'VUE']
            },
            'tailwind': {
                indicators: ['tailwind', 'tailwindcss', 'tailwind.css', 'tw-', 'tailwind.config'],
                regex: /\b(tailwind|tailwindcss|tailwind\.css|tw-|tailwind\.config)\b/gi,
                weight: 0.8,
                aliases: ['Tailwind', 'TAILWIND']
            },
            'vitest': {
                indicators: ['vitest', 'test', 'describe', 'it', 'expect', 'beforeEach', 'afterEach'],
                regex: /\b(vitest|test|describe|it|expect|beforeEach|afterEach)\b/gi,
                weight: 0.7,
                aliases: ['Vitest', 'VITE']
            },
            'playwright': {
                indicators: ['playwright', 'page.goto', 'page.click', 'page.fill', 'expect', 'test.describe'],
                regex: /\b(playwright|page\.goto|page\.click|page\.fill|expect|test\.describe)\b/gi,
                weight: 0.8,
                aliases: ['Playwright', 'PLAYWRIGHT']
            }
        },
        minConfidence: 0.2,
        minIndicators: 1
    },
    actions: [
        {type: 'analyze', target: 'tech-detection'},
        {type: 'inject', target: 'metadata'}
    ],
    triggersMode: 'any',
    priority: 6
};

/**
 * Analyze data for technology patterns
 */
export function detectTechnologies(data: unknown): TechDetectionResult {
    const result: TechDetectionResult = {};

    if (typeof data === 'string') {
        return detectTechnologiesFromString(data);
    } else if (typeof data === 'object' && data !== null) {
        return detectTechnologiesFromObject(data as Record<string, unknown>);
    }

    return result;
}

/**
 * Analyze string data for technology patterns
 */
function detectTechnologiesFromString(text: string): TechDetectionResult {
    const result: TechDetectionResult = {};
    const textLower = text.toLowerCase();

    const techPatterns = techDetectorNeuron.knowledge.techPatterns as Record<string, any>;

    for (const [techName, techConfig] of Object.entries(techPatterns)) {
        const indicators = techConfig.indicators;
        const regex = techConfig.regex;
        const weight = techConfig.weight;

        // Count indicator matches
        const matches = text.match(regex);
        const indicatorCount = matches ? matches.length : 0;

        // Calculate confidence based on indicator count and weight
        const confidence = Math.min(1.0, indicatorCount * weight * 0.5);

        if (confidence >= (techDetectorNeuron.knowledge.minConfidence as number)) {
            // Find specific indicators found
            const foundIndicators = indicators.filter(indicator =>
                textLower.includes(indicator.toLowerCase())
            );

            // Extract context around technology mentions
            const context = extractContext(text, indicators);

            if (foundIndicators.length >= (techDetectorNeuron.knowledge.minIndicators as number)) {
                result[`tech_${techName}`] = {
                    technology: techName,
                    confidence: Math.round(confidence * 100) / 100,
                    indicators: foundIndicators,
                    context: context
                };
            }
        }
    }

    return result;
}

/**
 * Analyze object structure for technology patterns
 */
function detectTechnologiesFromObject(obj: Record<string, unknown>): TechDetectionResult {
    const result: TechDetectionResult = {};
    const jsonString = JSON.stringify(obj, null, 2);

    return detectTechnologiesFromString(jsonString);
}

/**
 * Extract context around technology mentions
 */
function extractContext(text: string, indicators: string[]): string[] {
    const context: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
        const lineLower = line.toLowerCase();
        const foundIndicators = indicators.filter(indicator => lineLower.includes(indicator.toLowerCase()));
        
        if (foundIndicators.length > 0) {
            const trimmedLine = line.trim();
            if (trimmedLine.length > 0 && !context.includes(trimmedLine)) {
                context.push(trimmedLine);
            }
        }
    }

    return context.slice(0, 5); // Limit to first 5 context lines
}

/**
 * Add technology metadata to data
 */
export function addTechMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const result = {...data};
    const textFields = getTextFields(data);

    for (const [fieldPath, text] of Object.entries(textFields)) {
        const technologies = detectTechnologiesFromString(text);
        if (Object.keys(technologies).length > 0) {
            result[`_tech_metadata_${fieldPath.replace(/\./g, '_')}`] = technologies;
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

        if (typeof value === 'string' && value.length > 5) {
            textFields[fieldPath] = value;
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const nestedFields = getTextFields(value as Record<string, unknown>, fieldPath);
            Object.assign(textFields, nestedFields);
        } else if (Array.isArray(value)) {
            value.forEach((item, index) => {
                if (typeof item === 'string' && item.length > 5) {
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