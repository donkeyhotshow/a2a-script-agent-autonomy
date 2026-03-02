/**
 * Framework Extractor Service
 * Extracts framework versions from package.json and composer.json
 *
 * Used on first session request to determine project tech stack.
 */

import {logger} from '../utils/logger.js';

export interface ExtractedFrameworks {
    frontend: string[];   // ["vue@3.5.0", "inertia@2.2.18", "tailwind@3.4.0"]
    backend: string[];    // ["laravel@11.0", "php@8.2"]
    testing: string[];    // ["vitest@4.0.18", "playwright@1.58.1"]
    libraries: {
        js: string[];       // ["pinia", "vue-router", "axios"]
        php: string[];      // ["laravel/sanctum", "laravel/tinker"]
    };
    phpVersion: string | undefined;  // "8.2"
    nodeVersion: string | undefined; // from engines
}

// Known frontend frameworks and libraries
const FRONTEND_FRAMEWORKS = [
    'vue', 'react', 'svelte', 'angular', '@angular/core',
    'inertiajs', '@inertiajs/vue3', '@inertiajs/react',
    'tailwindcss', 'bootstrap', 'vuetify', 'quasar',
    'nuxt', 'next', 'sveltekit',
];

const TESTING_FRAMEWORKS = [
    'vitest', 'jest', 'mocha', 'karma',
    'playwright', 'cypress', '@playwright/test',
    '@testing-library/vue', '@testing-library/react',
    'phpunit', 'pest', 'codeception',
];

// Known backend frameworks (for composer.json)
const BACKEND_FRAMEWORKS = [
    'laravel/framework', 'symfony/symfony', 'slim/slim',
    'laminas/laminas-mvc', 'yii2', 'cakephp/cakephp',
    'spiral/framework', 'cycle/orm',
];

/**
 * Parse version from semver string
 */
function parseVersion(version: string): string {
    // Remove ^, ~, >=, >, <, <=, ||, etc.
    const cleaned = version.replace(/^[\^~>=<|]+\s*/g, '').split(' ')[0]?.split('-')[0];
    return cleaned || version;
}

/**
 * Format framework name with version
 */
function formatFramework(name: string, version: string): string {
    const cleanVersion = parseVersion(version);
    const shortName = name.includes('/') ? name.split('/')[1] || name : name;
    return `${shortName}@${cleanVersion}`;
}

/**
 * Extract frameworks from package.json content
 */
export function extractFromPackageJson(content: string): Partial<ExtractedFrameworks> {
    const result: Partial<ExtractedFrameworks> = {
        frontend: [],
        testing: [],
        libraries: {js: [], php: []},
    };

    try {
        const pkg = JSON.parse(content);

        const allDeps = {
            ...pkg.dependencies,
            ...pkg.devDependencies,
        };

        for (const [name, version] of Object.entries(allDeps)) {
            const ver = String(version);

            // Check frontend frameworks
            if (FRONTEND_FRAMEWORKS.some(f => name.toLowerCase().includes(f.toLowerCase()))) {
                result.frontend!.push(formatFramework(name, ver));
                continue;
            }

            // Check testing frameworks
            if (TESTING_FRAMEWORKS.some(t => name.toLowerCase().includes(t.toLowerCase()))) {
                result.testing!.push(formatFramework(name, ver));
                continue;
            }

            // Other JS libraries (skip internal/dev packages)
            if (!name.startsWith('@types/') &&
                !name.startsWith('@vue/') &&
                !name.includes('eslint') &&
                !name.includes('prettier') &&
                !name.includes('typescript')) {
                result.libraries!.js.push(name);
            }
        }

        // Extract Node version from engines
        if (pkg.engines?.node) {
            result.nodeVersion = parseVersion(pkg.engines.node);
        }

        logger.debug('[FrameworkExtractor] package.json parsed', {
            frontend: result.frontend?.length,
            testing: result.testing?.length,
        });

    } catch (err) {
        logger.warn('[FrameworkExtractor] Failed to parse package.json', {error: String(err)});
    }

    return result;
}

/**
 * Extract frameworks from composer.json content
 */
export function extractFromComposerJson(content: string): Partial<ExtractedFrameworks> {
    const result: Partial<ExtractedFrameworks> = {
        backend: [],
        libraries: {js: [], php: []},
    };

    try {
        const composer = JSON.parse(content);

        const allDeps = {
            ...composer.require,
            ...composer['require-dev'],
        };

        for (const [name, version] of Object.entries(allDeps)) {
            const ver = String(version);

            // PHP version
            if (name === 'php') {
                result.phpVersion = parseVersion(ver);
                continue;
            }

            // Check backend frameworks
            if (BACKEND_FRAMEWORKS.some(f => name.toLowerCase().includes(f.toLowerCase()))) {
                result.backend!.push(formatFramework(name, ver));
                continue;
            }

            // Testing frameworks (PHPUnit, Pest)
            if (TESTING_FRAMEWORKS.some(t => name.toLowerCase().includes(t.toLowerCase()))) {
                if (!result.testing) result.testing = [];
                result.testing.push(formatFramework(name, ver));
                continue;
            }

            // Other PHP libraries
            if (name.includes('/')) {
                result.libraries!.php.push(name);
            }
        }

        logger.debug('[FrameworkExtractor] composer.json parsed', {
            backend: result.backend?.length,
            phpVersion: result.phpVersion,
        });

    } catch (err) {
        logger.warn('[FrameworkExtractor] Failed to parse composer.json', {error: String(err)});
    }

    return result;
}

/**
 * Merge extraction results
 */
function mergeResults(
    pkgResult: Partial<ExtractedFrameworks>,
    composerResult: Partial<ExtractedFrameworks>
): ExtractedFrameworks {
    return {
        frontend: pkgResult.frontend || [],
        backend: composerResult.backend || [],
        testing: [...(pkgResult.testing || []), ...(composerResult.testing || [])],
        libraries: {
            js: pkgResult.libraries?.js || [],
            php: composerResult.libraries?.php || [],
        },
        phpVersion: composerResult.phpVersion,
        nodeVersion: pkgResult.nodeVersion,
    };
}

/**
 * Extract frameworks from code blocks
 * Looks for package.json and composer.json in the provided blocks
 */
export function extractFrameworks(codeBlocks: Array<{ path: string; content: string }>): ExtractedFrameworks {
    logger.info('[FrameworkExtractor] Extracting frameworks', {blockCount: codeBlocks.length});

    let pkgResult: Partial<ExtractedFrameworks> = {};
    let composerResult: Partial<ExtractedFrameworks> = {};

    for (const block of codeBlocks) {
        const fileName = block.path.split('/').pop()?.toLowerCase() || '';

        if (fileName === 'package.json') {
            logger.debug('[FrameworkExtractor] Found package.json', {path: block.path});
            pkgResult = extractFromPackageJson(block.content);
        }

        if (fileName === 'composer.json') {
            logger.debug('[FrameworkExtractor] Found composer.json', {path: block.path});
            composerResult = extractFromComposerJson(block.content);
        }
    }

    const result = mergeResults(pkgResult, composerResult);

    logger.info('[FrameworkExtractor] Extraction complete', {
        frontend: result.frontend,
        backend: result.backend,
        testing: result.testing.length,
        phpVersion: result.phpVersion,
    });

    return result;
}

/**
 * Check if code blocks contain initial project files (package.json/composer.json)
 */
export function hasInitialProjectFiles(codeBlocks: Array<{ path: string; content: string }>): boolean {
    return codeBlocks.some(block => {
        const fileName = block.path.split('/').pop()?.toLowerCase() || '';
        return fileName === 'package.json' || fileName === 'composer.json';
    });
}

/**
 * Get framework-specific neuron triggers
 * Returns triggers that should activate based on detected frameworks
 */
export function getFrameworkTriggers(frameworks: ExtractedFrameworks): string[] {
    const triggers: string[] = [];

    // Vue triggers
    if (frameworks.frontend.some(f => f.includes('vue'))) {
        triggers.push('vue', 'vue3', 'vue-component');
    }

    // Inertia triggers
    if (frameworks.frontend.some(f => f.includes('inertia'))) {
        triggers.push('inertia', 'inertia-vue', 'inertia-props');
    }

    // Laravel triggers
    if (frameworks.backend.some(f => f.includes('laravel'))) {
        triggers.push('laravel', 'eloquent', 'blade');
    }

    // Tailwind triggers
    if (frameworks.frontend.some(f => f.includes('tailwind'))) {
        triggers.push('tailwind', 'tailwind-classes');
    }

    // Testing triggers
    if (frameworks.testing.some(t => t.includes('vitest'))) {
        triggers.push('vitest', 'unit-test');
    }
    if (frameworks.testing.some(t => t.includes('playwright'))) {
        triggers.push('playwright', 'e2e-test');
    }

    return triggers;
}
