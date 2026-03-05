/**
 * Testing Framework Detector Neuron
 *
 * Detects testing framework patterns and configurations.
 * Used for identifying testing setup and test file structures.
 */

import type {Neuron} from '../types/knowledge.types.js';

export interface TestingFrameworkMetadata {
    framework: string;
    confidence: number;
    testTypes: string[];
    configuration: string[];
    patterns: string[];
}

export interface TestingFrameworkDetectionResult {
    [key: string]: TestingFrameworkMetadata;
}

export const testingFrameworkDetectorNeuron: Neuron = {
    id: 'neuron-testing-framework-detector',
    name: 'Testing Framework Detector',
    category: 'custom_lint',
    triggers: ['*'], // Reacts to any testing-related data
    knowledge: {
        description: 'Detects testing framework patterns and configurations',
        frameworkPatterns: {
            'vitest': {
                indicators: ['vitest', 'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'],
                configFiles: ['vitest.config.js', 'vitest.config.ts', 'vite.config.js', 'vite.config.ts'],
                testPatterns: ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js'],
                regex: /\b(vitest|describe|it|test|expect|beforeEach|afterEach|beforeAll|afterAll)\b/gi,
                weight: 0.9,
                testTypes: ['unit', 'integration', 'mock']
            },
            'playwright': {
                indicators: ['playwright', 'test.describe', 'test.beforeEach', 'test.afterEach', 'page.goto', 'page.click', 'page.fill'],
                configFiles: ['playwright.config.js', 'playwright.config.ts', 'playwright.config.mjs'],
                testPatterns: ['*.e2e.ts', '*.e2e.js', '*.spec.ts', '*.spec.js'],
                regex: /\b(playwright|test\.describe|test\.beforeEach|test\.afterEach|page\.goto|page\.click|page\.fill)\b/gi,
                weight: 0.9,
                testTypes: ['e2e', 'browser', 'ui']
            },
            'jest': {
                indicators: ['jest', 'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'],
                configFiles: ['jest.config.js', 'jest.config.ts', 'jest.config.json'],
                testPatterns: ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js'],
                regex: /\b(jest|describe|it|test|expect|beforeEach|afterEach|beforeAll|afterAll)\b/gi,
                weight: 0.8,
                testTypes: ['unit', 'integration', 'snapshot']
            },
            'cypress': {
                indicators: ['cypress', 'cy.visit', 'cy.get', 'cy.click', 'cy.type', 'cy.contains'],
                configFiles: ['cypress.config.js', 'cypress.config.ts'],
                testPatterns: ['*.cy.ts', '*.cy.js'],
                regex: /\b(cypress|cy\.visit|cy\.get|cy\.click|cy\.type|cy\.contains)\b/gi,
                weight: 0.8,
                testTypes: ['e2e', 'component', 'ui']
            }
        },
        minConfidence: 0.3,
        minIndicators: 2
    },
    actions: [
        {type: 'analyze', target: 'testing-framework-detection'},
        {type: 'inject', target: 'metadata'}
    ],
    triggersMode: 'any',
    priority: 6
};

/**
 * Analyze data for testing framework patterns
 */
export function detectTestingFrameworks(data: unknown): TestingFrameworkDetectionResult {
    const result: TestingFrameworkDetectionResult = {};

    if (typeof data === 'string') {
        return detectTestingFrameworksFromString(data);
    } else if (typeof data === 'object' && data !== null) {
        return detectTestingFrameworksFromObject(data as Record<string, unknown>);
    }

    return result;
}

/**
 * Analyze string data for testing framework patterns
 */
function detectTestingFrameworksFromString(text: string): TestingFrameworkDetectionResult {
    const result: TestingFrameworkDetectionResult = {};
    const textLower = text.toLowerCase();

    const frameworkPatterns = testingFrameworkDetectorNeuron.knowledge.frameworkPatterns as Record<string, any>;

    for (const [frameworkName, frameworkConfig] of Object.entries(frameworkPatterns)) {
        const indicators = frameworkConfig.indicators;
        const configFiles = frameworkConfig.configFiles;
        const regex = frameworkConfig.regex;
        const weight = frameworkConfig.weight;
        const testTypes = frameworkConfig.testTypes;

        // Count indicator matches
        const matches = text.match(regex);
        const indicatorCount = matches ? matches.length : 0;

        // Count configuration files mentioned
        const configCount = configFiles.filter(configFile =>
            textLower.includes(configFile.toLowerCase())
        ).length;

        // Calculate confidence based on indicators and configuration
        const indicatorConfidence = Math.min(1.0, indicatorCount * 0.2);
        const configConfidence = configCount > 0 ? 0.3 : 0;
        const confidence = Math.min(1.0, (indicatorConfidence + configConfidence) * weight);

        if (confidence >= (testingFrameworkDetectorNeuron.knowledge.minConfidence as number)) {
            // Find specific indicators found
            const foundIndicators = indicators.filter(indicator =>
                textLower.includes(indicator.toLowerCase())
            );

            // Find configuration files mentioned
            const foundConfigs = configFiles.filter(configFile =>
                textLower.includes(configFile.toLowerCase())
            );

            if (foundIndicators.length >= (testingFrameworkDetectorNeuron.knowledge.minIndicators as number)) {
                result[`testing_framework_${frameworkName}`] = {
                    framework: frameworkName,
                    confidence: Math.round(confidence * 100) / 100,
                    testTypes: testTypes,
                    configuration: foundConfigs,
                    patterns: foundIndicators.slice(0, 5)
                };
            }
        }
    }

    return result;
}

/**
 * Analyze object structure for testing framework patterns
 */
function detectTestingFrameworksFromObject(obj: Record<string, unknown>): TestingFrameworkDetectionResult {
    const result: TestingFrameworkDetectionResult = {};
    const jsonString = JSON.stringify(obj, null, 2);

    return detectTestingFrameworksFromString(jsonString);
}

/**
 * Add testing framework metadata to data
 */
export function addTestingFrameworkMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const result = {...data};
    const textFields = getTextFields(data);

    for (const [fieldPath, text] of Object.entries(textFields)) {
        const frameworks = detectTestingFrameworksFromString(text);
        if (Object.keys(frameworks).length > 0) {
            result[`_testing_framework_metadata_${fieldPath.replace(/\./g, '_')}`] = frameworks;
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