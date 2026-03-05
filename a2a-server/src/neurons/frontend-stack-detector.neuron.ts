/**
 * Frontend Stack Detector Neuron
 *
 * Detects frontend technology stack patterns and combinations.
 * Used for identifying frontend architecture and framework usage.
 */

import type {Neuron} from '../types/knowledge.types.js';

export interface FrontendStackMetadata {
    stack: string;
    confidence: number;
    frameworks: string[];
    patterns: string[];
    combination: boolean;
}

export interface FrontendStackDetectionResult {
    [key: string]: FrontendStackMetadata;
}

export const frontendStackDetectorNeuron: Neuron = {
    id: 'neuron-frontend-stack-detector',
    name: 'Frontend Stack Detector',
    category: 'custom_lint',
    triggers: ['*'], // Reacts to any frontend-related data
    knowledge: {
        description: 'Detects frontend technology stack patterns and combinations',
        stackPatterns: {
            'vue-tailwind': {
                frameworks: ['vue', 'tailwind'],
                indicators: ['v-if', 'v-for', 'tw-', 'vue', 'tailwind'],
                regex: /\b(v-if|v-for|tw-|vue|tailwind)\b/gi,
                weight: 0.95,
                description: 'Vue.js with Tailwind CSS stack'
            },
            'inertia-vue': {
                frameworks: ['inertia', 'vue'],
                indicators: ['inertia', 'vue', 'usePage', 'Inertia'],
                regex: /\b(inertia|vue|usePage|Inertia)\b/gi,
                weight: 0.9,
                description: 'Inertia.js with Vue.js stack'
            },
            'laravel-inertia': {
                frameworks: ['laravel', 'inertia'],
                indicators: ['laravel', 'inertia', 'Inertia::render', 'App\\Providers\\Inertia'],
                regex: /\b(laravel|inertia|Inertia::render|App\\\\Providers\\\\Inertia)\b/gi,
                weight: 0.9,
                description: 'Laravel with Inertia.js backend'
            },
            'testing-stack': {
                frameworks: ['vitest', 'playwright'],
                indicators: ['vitest', 'playwright', 'describe', 'it', 'test.describe', 'page.goto'],
                regex: /\b(vitest|playwright|describe|it|test\.describe|page\.goto)\b/gi,
                weight: 0.85,
                description: 'Vitest and Playwright testing stack'
            }
        },
        minConfidence: 0.3,
        minFrameworks: 2
    },
    actions: [
        {type: 'analyze', target: 'frontend-stack-detection'},
        {type: 'inject', target: 'metadata'}
    ],
    triggersMode: 'any',
    priority: 7
};

/**
 * Analyze data for frontend stack patterns
 */
export function detectFrontendStacks(data: unknown): FrontendStackDetectionResult {
    const result: FrontendStackDetectionResult = {};

    if (typeof data === 'string') {
        return detectFrontendStacksFromString(data);
    } else if (typeof data === 'object' && data !== null) {
        return detectFrontendStacksFromObject(data as Record<string, unknown>);
    }

    return result;
}

/**
 * Analyze string data for frontend stack patterns
 */
function detectFrontendStacksFromString(text: string): FrontendStackDetectionResult {
    const result: FrontendStackDetectionResult = {};
    const textLower = text.toLowerCase();

    const stackPatterns = frontendStackDetectorNeuron.knowledge.stackPatterns as Record<string, any>;

    for (const [stackName, stackConfig] of Object.entries(stackPatterns)) {
        const frameworks = stackConfig.frameworks;
        const indicators = stackConfig.indicators;
        const regex = stackConfig.regex;
        const weight = stackConfig.weight;

        // Count indicator matches
        const matches = text.match(regex);
        const indicatorCount = matches ? matches.length : 0;

        // Count frameworks detected
        const detectedFrameworks = frameworks.filter(framework =>
            textLower.includes(framework.toLowerCase())
        );

        // Calculate confidence based on framework detection and indicators
        const frameworkConfidence = detectedFrameworks.length / frameworks.length;
        const indicatorConfidence = Math.min(1.0, indicatorCount * 0.1);
        const confidence = Math.min(1.0, (frameworkConfidence + indicatorConfidence) * weight);

        if (confidence >= (frontendStackDetectorNeuron.knowledge.minConfidence as number)) {
            // Find specific patterns found
            const foundPatterns = indicators.filter(indicator =>
                textLower.includes(indicator.toLowerCase())
            );

            if (detectedFrameworks.length >= (frontendStackDetectorNeuron.knowledge.minFrameworks as number)) {
                result[`frontend_stack_${stackName}`] = {
                    stack: stackName,
                    confidence: Math.round(confidence * 100) / 100,
                    frameworks: detectedFrameworks,
                    patterns: foundPatterns.slice(0, 5),
                    combination: detectedFrameworks.length > 2
                };
            }
        }
    }

    return result;
}

/**
 * Analyze object structure for frontend stack patterns
 */
function detectFrontendStacksFromObject(obj: Record<string, unknown>): FrontendStackDetectionResult {
    const result: FrontendStackDetectionResult = {};
    const jsonString = JSON.stringify(obj, null, 2);

    return detectFrontendStacksFromString(jsonString);
}

/**
 * Add frontend stack metadata to data
 */
export function addFrontendStackMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const result = {...data};
    const textFields = getTextFields(data);

    for (const [fieldPath, text] of Object.entries(textFields)) {
        const stacks = detectFrontendStacksFromString(text);
        if (Object.keys(stacks).length > 0) {
            result[`_frontend_stack_metadata_${fieldPath.replace(/\./g, '_')}`] = stacks;
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