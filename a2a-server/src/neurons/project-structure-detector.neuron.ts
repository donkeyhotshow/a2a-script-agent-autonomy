/**
 * Project Structure Detector Neuron
 *
 * Detects project structure patterns and directory organization.
 * Used for identifying project architecture and organization patterns.
 */

import type {Neuron} from '../types/knowledge.types.js';

export interface ProjectStructureMetadata {
    structure: string;
    confidence: number;
    directories: string[];
    files: string[];
    patterns: string[];
}

export interface ProjectStructureDetectionResult {
    [key: string]: ProjectStructureMetadata;
}

export const projectStructureDetectorNeuron: Neuron = {
    id: 'neuron-project-structure-detector',
    name: 'Project Structure Detector',
    category: 'custom_lint',
    triggers: ['*'], // Reacts to any project structure data
    knowledge: {
        description: 'Detects project structure patterns and directory organization',
        structurePatterns: {
            'laravel-app': {
                directories: ['app', 'bootstrap', 'config', 'database', 'public', 'resources', 'routes', 'storage', 'tests', 'vendor'],
                files: ['artisan', 'composer.json', 'phpunit.xml', 'server.php', 'webpack.mix.js'],
                indicators: ['app/Http', 'routes/web.php', 'database/migrations', 'resources/views'],
                regex: /\b(app|bootstrap|config|database|public|resources|routes|storage|tests|vendor)\b/gi,
                weight: 0.95,
                description: 'Laravel application structure'
            },
            'vue-inertia': {
                directories: ['resources/js', 'resources/css', 'resources/views', 'app/Http/Controllers'],
                files: ['app.js', 'bootstrap.js', 'app.scss', 'welcome.blade.php'],
                indicators: ['resources/js/Pages', 'resources/js/Layouts', 'app/Http/Controllers/PageController'],
                regex: /\b(resources\/js|resources\/css|resources\/views|app\/Http\/Controllers)\b/gi,
                weight: 0.9,
                description: 'Vue.js with Inertia.js structure'
            },
            'vite-project': {
                directories: ['src', 'public', 'tests', 'docs'],
                files: ['vite.config.js', 'package.json', 'tsconfig.json', 'index.html'],
                indicators: ['src/main.js', 'src/App.vue', 'public/index.html'],
                regex: /\b(src|public|tests|docs|vite\.config\.js|package\.json)\b/gi,
                weight: 0.85,
                description: 'Vite-based project structure'
            },
            'testing-setup': {
                directories: ['tests', 'e2e', 'specs', '__tests__'],
                files: ['vitest.config.js', 'playwright.config.js', 'jest.config.js', 'cypress.config.js'],
                indicators: ['tests/unit', 'tests/integration', 'e2e/pages', '__tests__/components'],
                regex: /\b(tests|e2e|specs|__tests__|vitest\.config|playwright\.config|jest\.config|cypress\.config)\b/gi,
                weight: 0.8,
                description: 'Testing-focused project structure'
            },
            'tailwind-project': {
                directories: ['src/css', 'src/styles', 'assets/css'],
                files: ['tailwind.config.js', 'postcss.config.js', 'tailwind.css'],
                indicators: ['@tailwind base', '@tailwind components', '@tailwind utilities'],
                regex: /\b(tailwind\.config|postcss\.config|@tailwind|src\/css|src\/styles|assets\/css)\b/gi,
                weight: 0.85,
                description: 'Tailwind CSS project structure'
            }
        },
        minConfidence: 0.3,
        minElements: 3
    },
    actions: [
        {type: 'analyze', target: 'project-structure-detection'},
        {type: 'inject', target: 'metadata'}
    ],
    triggersMode: 'any',
    priority: 5
};

/**
 * Analyze data for project structure patterns
 */
export function detectProjectStructures(data: unknown): ProjectStructureDetectionResult {
    const result: ProjectStructureDetectionResult = {};

    if (typeof data === 'string') {
        return detectProjectStructuresFromString(data);
    } else if (typeof data === 'object' && data !== null) {
        return detectProjectStructuresFromObject(data as Record<string, unknown>);
    }

    return result;
}

/**
 * Analyze string data for project structure patterns
 */
function detectProjectStructuresFromString(text: string): ProjectStructureDetectionResult {
    const result: ProjectStructureDetectionResult = {};
    const textLower = text.toLowerCase();

    const structurePatterns = projectStructureDetectorNeuron.knowledge.structurePatterns as Record<string, any>;

    for (const [structureName, structureConfig] of Object.entries(structurePatterns)) {
        const directories = structureConfig.directories;
        const files = structureConfig.files;
        const indicators = structureConfig.indicators;
        const regex = structureConfig.regex;
        const weight = structureConfig.weight;

        // Count directory matches
        const dirMatches = text.match(regex);
        const dirCount = dirMatches ? dirMatches.length : 0;

        // Count specific directories found
        const foundDirectories = directories.filter(dir =>
            textLower.includes(dir.toLowerCase())
        );

        // Count specific files found
        const foundFiles = files.filter(file =>
            textLower.includes(file.toLowerCase())
        );

        // Count indicators found
        const foundIndicators = indicators.filter(indicator =>
            textLower.includes(indicator.toLowerCase())
        );

        // Calculate confidence based on elements found
        const dirConfidence = foundDirectories.length / directories.length;
        const fileConfidence = foundFiles.length / files.length;
        const indicatorConfidence = foundIndicators.length / indicators.length;
        const confidence = Math.min(1.0, (dirConfidence + fileConfidence + indicatorConfidence) * weight / 3);

        if (confidence >= (projectStructureDetectorNeuron.knowledge.minConfidence as number)) {
            if (foundDirectories.length >= (projectStructureDetectorNeuron.knowledge.minElements as number)) {
                result[`project_structure_${structureName}`] = {
                    structure: structureName,
                    confidence: Math.round(confidence * 100) / 100,
                    directories: foundDirectories,
                    files: foundFiles,
                    patterns: foundIndicators.slice(0, 5)
                };
            }
        }
    }

    return result;
}

/**
 * Analyze object structure for project structure patterns
 */
function detectProjectStructuresFromObject(obj: Record<string, unknown>): ProjectStructureDetectionResult {
    const result: ProjectStructureDetectionResult = {};
    const jsonString = JSON.stringify(obj, null, 2);

    return detectProjectStructuresFromString(jsonString);
}

/**
 * Add project structure metadata to data
 */
export function addProjectStructureMetadata(data: Record<string, unknown>): Record<string, unknown> {
    const result = {...data};
    const textFields = getTextFields(data);

    for (const [fieldPath, text] of Object.entries(textFields)) {
        const structures = detectProjectStructuresFromString(text);
        if (Object.keys(structures).length > 0) {
            result[`_project_structure_metadata_${fieldPath.replace(/\./g, '_')}`] = structures;
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